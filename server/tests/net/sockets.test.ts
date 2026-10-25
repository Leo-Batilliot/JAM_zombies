import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { WebSocket } from "ws";
import {
  ClientMessageType,
  DemoCommand,
  JoinRejection,
  ServerMessageType,
  decodeServerMessage,
  encodeClientMessage,
  socketPath,
  type ClientMessage,
  type Config,
  type ServerMessage,
} from "@horde/shared";
import { attachSockets } from "../../src/net/sockets.js";
import { damage } from "../../src/systems/death.js";
import { startEvent } from "../../src/systems/events.js";
import { killMage } from "../../src/systems/mage.js";
import { createBench, type Bench } from "../support/bench.js";

let bench: Bench;
let server: Server;
let sockets: ReturnType<typeof attachSockets>;
let url: string;

const start = async (patch?: (config: Config) => void, demo = false) => {
  bench = createBench(patch);
  server = createServer();
  sockets = attachSockets(server, bench.world, { demo });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `ws://localhost:${String((server.address() as AddressInfo).port)}${socketPath}`;
};

beforeEach(async () => {
  await start();
});

afterEach(async () => {
  await sockets.close();
  await new Promise((resolve) => server.close(resolve));
});

const connect = async () => {
  const socket = new WebSocket(url);
  const received: ServerMessage[] = [];
  socket.on("message", (data: Buffer) => {
    received.push(decodeServerMessage(data, bench.config.world));
  });
  await new Promise((resolve) => socket.once("open", resolve));
  return {
    socket,
    received,
    send: (message: ClientMessage) => {
      socket.send(encodeClientMessage(message, bench.config.world));
    },
    of: <T extends ServerMessageType>(type: T) =>
      received.filter(
        (message): message is Extract<ServerMessage, { type: T }> =>
          message.type === type,
      ),
  };
};

const joined = async (name = "Ash", token = "") => {
  const client = await connect();
  client.send({ type: ClientMessageType.Join, name, token });
  await vi.waitFor(() => {
    expect(client.of(ServerMessageType.Config)).toHaveLength(1);
  });
  const [welcome] = client.of(ServerMessageType.Welcome);
  if (welcome === undefined) {
    throw new Error("Expected a welcome message");
  }
  return { ...client, welcome };
};

describe("joining", () => {
  test("a player joins and receives the welcome and the config", async () => {
    const client = await joined();
    expect(client.received.map((message) => message.type)).toEqual([
      ServerMessageType.Welcome,
      ServerMessageType.Config,
    ]);
    expect(client.welcome.token).toMatch(/^[0-9a-f]{32}$/);
    expect(bench.world.armies.size).toBe(1);
    client.socket.close();
  });

  test("an invalid name is rejected", async () => {
    const client = await connect();
    client.send({ type: ClientMessageType.Join, name: "<script>", token: "" });
    await vi.waitFor(() => {
      expect(client.received).toEqual([
        { type: ServerMessageType.Rejected, reason: JoinRejection.InvalidName },
      ]);
    });
    expect(bench.world.armies.size).toBe(0);
    client.socket.close();
  });

  test("a message before joining closes the connection", async () => {
    const client = await connect();
    client.send({ type: ClientMessageType.Move, x: 1, y: 1 });
    const code = await new Promise((resolve) =>
      client.socket.once("close", resolve),
    );
    expect(code).toBe(1008);
  });

  test("a full lobby rejects new players", async () => {
    await sockets.close();
    await new Promise((resolve) => server.close(resolve));
    await start((config) => {
      config.lobby.maxParticipants = 1;
    });
    const first = await joined();
    const second = await connect();
    second.send({ type: ClientMessageType.Join, name: "Late", token: "" });
    await vi.waitFor(() => {
      expect(second.received).toEqual([
        { type: ServerMessageType.Rejected, reason: JoinRejection.Full },
      ]);
    });
    first.socket.close();
    second.socket.close();
  });
});

describe("playing", () => {
  test("the player moves its mage and receives snapshots", async () => {
    const client = await joined();
    client.send({ type: ClientMessageType.View, width: 80, height: 45 });
    const army = [...bench.world.armies.values()][0];
    client.send({ type: ClientMessageType.Move, x: 0, y: 0 });
    await vi.waitFor(() => {
      expect(army?.mage.targetX).toBe(0);
    });
    bench.step();
    sockets.sendSnapshots();
    await vi.waitFor(() => {
      const [snapshot] = client.of(ServerMessageType.Snapshot);
      expect(snapshot?.entities.map((entity) => entity.id)).toContain(
        client.welcome.mageId,
      );
    });
    client.socket.close();
  });

  test("the player evolves its zombies", async () => {
    const client = await joined();
    const army = [...bench.world.armies.values()][0];
    if (army === undefined) {
      throw new Error("Expected an army");
    }
    client.send({ type: ClientMessageType.Evolve, evolution: "big-zombie" });
    await vi.waitFor(() => {
      expect([...army.units].map((unit) => unit.type)).toEqual(["big-zombie"]);
    });
    client.socket.close();
  });

  test("the player receives the leaderboard with its rank", async () => {
    const client = await joined();
    sockets.sendSnapshots();
    await vi.waitFor(() => {
      const [leaderboard] = client.of(ServerMessageType.Leaderboard);
      expect(leaderboard).toMatchObject({ rank: 1, total: 1 });
      expect(leaderboard?.entries[0]?.name).toBe("Ash");
    });
    client.socket.close();
  });

  test("the config is sent again after a reload", async () => {
    const client = await joined();
    sockets.broadcastConfig();
    await vi.waitFor(() => {
      expect(client.of(ServerMessageType.Config)).toHaveLength(2);
    });
    client.socket.close();
  });

  test("the player is told when its mage dies", async () => {
    const client = await joined();
    const army = [...bench.world.armies.values()][0];
    const killer = bench.addArmy(10, 10, "Evil Ash");
    if (army === undefined) {
      throw new Error("Expected an army");
    }
    killMage(bench.world, army, killer);
    sockets.sendSnapshots();
    await vi.waitFor(() => {
      expect(client.of(ServerMessageType.Died)).toEqual([
        { type: ServerMessageType.Died, killer: "Evil Ash" },
      ]);
    });
    client.socket.close();
  });
});

describe("events", () => {
  test("the player is told when the boss appears and dies", async () => {
    const client = await joined();
    const army = [...bench.world.armies.values()][0];
    const state = startEvent(bench.world, "pumpkin", 150, 120);
    if (army === undefined || state.boss === undefined) {
      throw new Error("Expected an army and a boss");
    }
    sockets.sendSnapshots();
    await vi.waitFor(() => {
      expect(client.of(ServerMessageType.EventStarted)).toHaveLength(1);
    });
    const [started] = client.of(ServerMessageType.EventStarted);
    expect(started?.event).toBe(0);
    expect(started?.x).toBeCloseTo(150, 1);
    damage(bench.world, state.boss, 1e9, army);
    sockets.sendSnapshots();
    await vi.waitFor(() => {
      expect(client.of(ServerMessageType.EventEnded)).toEqual([
        {
          type: ServerMessageType.EventEnded,
          event: 0,
          defeated: true,
          souls: bench.config.events.events["pumpkin"]?.rewardSouls,
        },
      ]);
    });
    client.socket.close();
  });

  test("a player who joins during the event is told about the boss", async () => {
    startEvent(bench.world, "pumpkin", 150, 120);
    const client = await joined();
    sockets.sendSnapshots();
    await vi.waitFor(() => {
      expect(client.of(ServerMessageType.EventStarted)).toHaveLength(1);
    });
    expect(client.of(ServerMessageType.EventEnded)).toHaveLength(0);
    client.socket.close();
  });
});

describe("demo mode", () => {
  test("demo commands are ignored outside demo mode", async () => {
    const client = await joined();
    const army = [...bench.world.armies.values()][0];
    const units = army?.units.size;
    client.send({ type: ClientMessageType.Demo, command: DemoCommand.Units });
    client.send({ type: ClientMessageType.Move, x: 5, y: 5 });
    await vi.waitFor(() => {
      expect(army?.mage.targetX).toBeCloseTo(5, 0);
    });
    expect(army?.units.size).toBe(units);
    client.socket.close();
  });

  test("demo commands run in demo mode", async () => {
    await sockets.close();
    await new Promise((resolve) => server.close(resolve));
    await start(undefined, true);
    const client = await joined();
    const army = [...bench.world.armies.values()][0];
    const units = army?.units.size ?? 0;
    client.send({ type: ClientMessageType.Demo, command: DemoCommand.Units });
    await vi.waitFor(() => {
      expect(army?.units.size).toBe(
        units + bench.config.gameplay.demo.unitCount,
      );
    });
    client.socket.close();
  });
});

describe("leaving", () => {
  test("a bot takes over the mage when the player disconnects", async () => {
    const client = await joined();
    client.socket.close();
    await vi.waitFor(() => {
      expect([...bench.world.armies.values()][0]?.bot).toBeDefined();
    });
    expect(bench.world.armies.size).toBe(1);
  });

  test("the player gets its army back with its token", async () => {
    const first = await joined();
    const army = [...bench.world.armies.values()][0];
    first.socket.close();
    await vi.waitFor(() => {
      expect(army?.bot).toBeDefined();
    });
    const second = await joined("Ash", first.welcome.token);
    expect(second.welcome.mageId).toBe(first.welcome.mageId);
    expect(army?.bot).toBeUndefined();
    expect(bench.world.armies.size).toBe(1);
    second.socket.close();
  });
});
