import { fork } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { parseArgs } from "node:util";
import { WebSocket } from "ws";
import {
  ClientMessageType,
  ServerMessageType,
  buildRegistries,
  decodeServerMessage,
  encodeClientMessage,
  socketPath,
  type ClientConfig,
} from "@horde/shared";
import { loadConfig } from "../src/config/load.js";
import { loadEnv } from "../src/env.js";
import { attachSockets } from "../src/net/sockets.js";
import { startLoop } from "../src/world/loop.js";
import { World } from "../src/world/world.js";

interface Options {
  participants: number;
  units: number;
  seconds: number;
  warmup: number;
  viewWidth: number;
  viewHeight: number;
  bots: boolean;
}

interface ClientReport {
  bytes: number[];
  messages: number[];
}

const readOptions = (): Options => {
  const { values } = parseArgs({
    options: {
      participants: { type: "string" },
      units: { type: "string" },
      seconds: { type: "string" },
      warmup: { type: "string" },
      view: { type: "string" },
      bots: { type: "boolean" },
    },
  });
  const number = (name: Exclude<keyof typeof values, "bots">): number => {
    const value = Number(values[name]);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Missing or invalid --${name}`);
    }
    return value;
  };
  const [viewWidth, viewHeight] = (values.view ?? "").split("x").map(Number);
  if (viewWidth === undefined || viewHeight === undefined) {
    throw new Error("Missing or invalid --view, expected <width>x<height>");
  }
  return {
    participants: number("participants"),
    units: number("units"),
    seconds: number("seconds"),
    warmup: number("warmup"),
    viewWidth,
    viewHeight,
    bots: values.bots ?? false,
  };
};

const runClients = (url: string, options: Options): void => {
  const bytes = new Array<number>(options.participants).fill(0);
  const messages = new Array<number>(options.participants).fill(0);
  let counting = false;
  for (let index = 0; index < options.participants; index++) {
    const socket = new WebSocket(url);
    let config: ClientConfig | undefined;
    socket.on("open", () => {
      socket.send(
        encodeClientMessage(
          {
            type: ClientMessageType.Join,
            name: `Load ${String(index + 1)}`,
            token: "",
          },
          undefined,
        ),
      );
    });
    socket.on("message", (data: Buffer) => {
      if (counting) {
        bytes[index] = (bytes[index] ?? 0) + data.byteLength;
        messages[index] = (messages[index] ?? 0) + 1;
      }
      if (config !== undefined) {
        return;
      }
      const message = decodeServerMessage(data, undefined);
      if (message.type === ServerMessageType.Config) {
        config = message.config;
        socket.send(
          encodeClientMessage(
            {
              type: ClientMessageType.View,
              width: options.viewWidth,
              height: options.viewHeight,
            },
            config.world,
          ),
        );
        process.send?.({ joined: index });
      }
    });
  }
  process.on("message", (command: string) => {
    if (command === "start") {
      counting = true;
    } else {
      const report: ClientReport = { bytes, messages };
      process.send?.(report, () => process.exit(0));
    }
  });
};

const percentile = (values: number[], ratio: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] ?? 0
  );
};

const wait = (seconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

const runServer = async (options: Options): Promise<void> => {
  const env = loadEnv();
  const config = loadConfig(env.CONFIG_DIR);
  if (!options.bots) {
    config.lobby.minParticipants = 0;
  }
  config.lobby.maxParticipants = Math.max(
    config.lobby.maxParticipants,
    options.participants,
  );
  const world = new World(config, buildRegistries(config));
  const server = createServer();
  const sockets = attachSockets(server, world);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const loop = startLoop(world, sockets.sendSnapshots);

  const clients = fork(process.argv[1] ?? "", process.argv.slice(2), {
    env: {
      ...process.env,
      LOAD_TEST_URL: `ws://localhost:${String(port)}${socketPath}`,
    },
  });
  await new Promise<void>((resolve) => {
    let joined = 0;
    clients.on("message", () => {
      joined++;
      if (joined === options.participants) {
        resolve();
      }
    });
  });

  const { startingUnits, spawnRadius } = config.gameplay.army;
  const fillTypes = startingUnits.map((entry) => entry.unit);
  for (const army of world.armies.values()) {
    while (army.units.size < options.units) {
      const { x, y } = world.randomNear(army.mage.x, army.mage.y, spawnRadius);
      const type = fillTypes[army.units.size % fillTypes.length];
      if (type === undefined) {
        throw new Error("The starting army has no unit type");
      }
      world.addUnit(army, type, x, y);
    }
  }
  await wait(options.warmup);

  Object.assign(loop.stats, { maxMs: 0, totalMs: 0, ticks: 0 });
  const tickTimes: number[] = [];
  const sample = setInterval(() => {
    tickTimes.push(loop.stats.lastMs);
  }, 1000 / config.network.tickRate);
  clients.send("start");
  await wait(options.seconds);
  clearInterval(sample);

  const report = await new Promise<ClientReport>((resolve) => {
    clients.once("message", (message: ClientReport) => {
      resolve(message);
    });
    clients.send("stop");
  });
  loop.stop();

  let units = 0;
  let bots = 0;
  for (const army of world.armies.values()) {
    units += army.units.size;
    bots += army.bot === undefined ? 0 : 1;
  }
  const perClient = report.bytes.map((total) => total / options.seconds / 1024);
  const budgetMs = 1000 / config.network.tickRate;
  console.info(
    [
      `Participants: ${String(world.armies.size)} (${String(bots)} bots), units at the end: ${String(units)}, entities: ${String(world.entities.size)}`,
      `View: ${String(options.viewWidth)} x ${String(options.viewHeight)} m, measured over ${String(options.seconds)} s`,
      `Tick: average ${(loop.stats.totalMs / loop.stats.ticks).toFixed(2)} ms, p95 ${percentile(tickTimes, 0.95).toFixed(2)} ms, max ${loop.stats.maxMs.toFixed(2)} ms (budget ${budgetMs.toFixed(1)} ms)`,
      `Throughput per client: average ${(perClient.reduce((a, b) => a + b, 0) / perClient.length).toFixed(1)} KB/s, max ${Math.max(...perClient).toFixed(1)} KB/s`,
    ].join("\n"),
  );
  await sockets.close();
  server.close();
};

const options = readOptions();
const url = process.env["LOAD_TEST_URL"];
if (url === undefined) {
  await runServer(options);
} else {
  runClients(url, options);
}
