import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { WebSocket } from "ws";
import {
  CardKind,
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
import { Lobbies } from "../../src/lobby/lobbies.js";
import { attachSockets } from "../../src/net/sockets.js";
import { damage } from "../../src/systems/death.js";
import { startEvent } from "../../src/systems/events.js";
import { killMage } from "../../src/systems/mage.js";
import { World } from "../../src/world/world.js";
import { createBench, type Bench } from "../support/bench.js";

let bench: Bench;
let server: Server;
let lobbies: Lobbies;
let sockets: ReturnType<typeof attachSockets>;
let url: string;

const start = async (patch?: (config: Config) => void, demo = false) => {
  bench = createBench(patch);
  server = createServer();
  let created = 0;
  lobbies = new Lobbies(
    bench.config,
    () =>
      created++ === 0
        ? bench.world
        : new World(bench.config, bench.world.registries),
    () => () => undefined,
  );
  sockets = attachSockets(server, lobbies, { demo });
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

const joined = async (name = "Ash", token = "", skin = 0) => {
  const client = await connect();
  client.send({ type: ClientMessageType.Join, name, token, skin });
  await vi.waitFor(() => {
    expect(client.of(ServerMessageType.Welcome)).toHaveLength(1);
  });
  const [welcome] = client.of(ServerMessageType.Welcome);
  if (welcome === undefined) {
    throw new Error("Expected a welcome message");
  }
  return { ...client, welcome };
};

describe("joining", () => {
  test("a player receives the config on connection, then the welcome", async () => {
    const client = await joined();
    expect(client.received.map((message) => message.type)).toEqual([
      ServerMessageType.Config,
      ServerMessageType.Welcome,
    ]);
    expect(client.welcome.token).toMatch(/^[0-9a-f]{32}$/);
    expect(bench.world.armies.size).toBe(1);
    client.socket.close();
  });

  test("an invalid name is rejected", async () => {
    const client = await connect();
    client.send({
      type: ClientMessageType.Join,
      name: "<script>",
      token: "",
      skin: 0,
    });
    await vi.waitFor(() => {
      expect(client.of(ServerMessageType.Rejected)).toEqual([
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

  test("new players are rejected when every lobby is full", async () => {
    await sockets.close();
    await new Promise((resolve) => server.close(resolve));
    await start((config) => {
      config.lobby.maxParticipants = 1;
      config.lobby.maxLobbies = 1;
    });
    const first = await joined();
    const second = await connect();
    second.send({
      type: ClientMessageType.Join,
      name: "Late",
      token: "",
      skin: 0,
    });
    await vi.waitFor(() => {
      expect(second.of(ServerMessageType.Rejected)).toEqual([
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
    client.send({ type: ClientMessageType.Move, x: 20, y: 30 });
    await vi.waitFor(() => {
      expect(army?.mage.targetX).toBeCloseTo(20, 1);
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

  test("the player chooses a card and casts its spell", async () => {
    const client = await joined();
    const army = [...bench.world.armies.values()][0];
    if (army === undefined) {
      throw new Error("Expected an army");
    }
    army.pendingLevels = 1;
    army.cards = [{ kind: "spell", spell: "rallying-cry" }];
    sockets.sendSnapshots();
    await vi.waitFor(() => {
      expect(client.of(ServerMessageType.Status).at(-1)?.cards).toEqual([
        {
          kind: CardKind.Spell,
          index: bench.world.registries.spells.index("rallying-cry"),
        },
      ]);
    });
    client.send({ type: ClientMessageType.Choose, card: 0 });
    await vi.waitFor(() => {
      expect(army.spell).toBe("rallying-cry");
    });
    client.send({ type: ClientMessageType.Cast });
    await vi.waitFor(() => {
      expect(army.rally.until).toBeGreaterThan(bench.world.time);
    });
    client.socket.close();
  });

  test("the player is told what it found", async () => {
    const client = await joined();
    const army = [...bench.world.armies.values()][0];
    if (army === undefined) {
      throw new Error("Expected an army");
    }
    army.found.push("chainsaw");
    sockets.sendSnapshots();
    await vi.waitFor(() => {
      expect(client.of(ServerMessageType.Loot)).toEqual([
        {
          type: ServerMessageType.Loot,
          item: bench.world.registries.items.index("chainsaw"),
        },
      ]);
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
      expect(client.of(ServerMessageType.Died)).toMatchObject([
        {
          type: ServerMessageType.Died,
          killer: "Evil Ash",
          stats: { level: 1, mageKills: 0 },
        },
      ]);
    });
    client.send({ type: ClientMessageType.Respawn });
    await vi.waitFor(() => {
      expect(army.respawnRequested).toBe(true);
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

describe("formations and bounty", () => {
  test("the player changes formation and sees the change in its status", async () => {
    const client = await joined();
    const army = [...bench.world.armies.values()][0];
    if (army === undefined) {
      throw new Error("Expected an army");
    }
    client.send({ type: ClientMessageType.Formation, formation: 1 });
    await vi.waitFor(() => {
      expect(army.formation).toBe(
        Object.keys(bench.config.formations.selectable)[1],
      );
    });
    sockets.sendSnapshots();
    await vi.waitFor(() => {
      const status = client.of(ServerMessageType.Status).at(-1);
      expect(status?.formation).toBe(2);
      expect(status?.formationCooldown).toBeCloseTo(1, 1);
    });
    client.socket.close();
  });

  test("the leaderboard names the bounty with its position", async () => {
    const client = await joined();
    const army = [...bench.world.armies.values()][0];
    if (army === undefined) {
      throw new Error("Expected an army");
    }
    sockets.sendSnapshots();
    await vi.waitFor(() => {
      const [leaderboard] = client.of(ServerMessageType.Leaderboard);
      expect(leaderboard?.bounty.army).toBe(army.slot);
      expect(leaderboard?.bounty.x).toBeCloseTo(army.mage.x, 1);
    });
    client.socket.close();
  });
});

describe("bonus content", () => {
  test("the config arrives before joining", async () => {
    const client = await connect();
    await vi.waitFor(() => {
      expect(client.of(ServerMessageType.Config)).toHaveLength(1);
    });
    expect(
      client.of(ServerMessageType.Config)[0]?.config.content.skins,
    ).toEqual(
      Object.entries(bench.config.gameplay.mage.skins).map(([id, skin]) => ({
        id,
        name: skin.name,
      })),
    );
    client.socket.close();
  });

  test("the chosen skin is shown as the type of the mage", async () => {
    const client = await joined("Ash", "", 2);
    client.send({ type: ClientMessageType.View, width: 40, height: 20 });
    await vi.waitFor(() => {
      expect([...bench.world.armies.values()][0]?.skin).toBe(
        Object.keys(bench.config.gameplay.mage.skins)[2],
      );
    });
    sockets.sendSnapshots();
    await vi.waitFor(() => {
      const [snapshot] = client.of(ServerMessageType.Snapshot);
      expect(
        snapshot?.entities.find((entity) => entity.id === client.welcome.mageId)
          ?.type,
      ).toBe(2);
    });
    client.socket.close();
  });

  test("a player who finds the lobby full plays in a new lobby", async () => {
    await sockets.close();
    await new Promise((resolve) => server.close(resolve));
    await start((config) => {
      config.lobby.maxParticipants = 1;
    });
    const first = await joined("Ash");
    const second = await joined("Bub");
    expect(lobbies.worlds).toHaveLength(2);
    expect(bench.world.armies.size).toBe(1);
    const other = lobbies.worlds[1];
    if (other === undefined) {
      throw new Error("Expected a second lobby");
    }
    sockets.sendSnapshots(other);
    await vi.waitFor(() => {
      const [leaderboard] = second.of(ServerMessageType.Leaderboard);
      expect(leaderboard?.entries.map((entry) => entry.name)).toEqual(["Bub"]);
    });
    expect(first.of(ServerMessageType.Leaderboard)).toHaveLength(0);
    first.socket.close();
    second.socket.close();
  });

  test("a spectator follows a mage without one of its own", async () => {
    const player = await joined("Ash");
    const watcher = await connect();
    watcher.send({ type: ClientMessageType.Spectate });
    await vi.waitFor(() => {
      expect(watcher.of(ServerMessageType.Welcome)).toEqual([
        { type: ServerMessageType.Welcome, mageId: 0, token: "" },
      ]);
    });
    watcher.send({ type: ClientMessageType.View, width: 40, height: 20 });
    watcher.send({ type: ClientMessageType.Move, x: 1, y: 1 });
    const army = [...bench.world.armies.values()][0];
    sockets.sendSnapshots();
    await vi.waitFor(() => {
      expect(watcher.of(ServerMessageType.Focus)).toEqual([
        {
          type: ServerMessageType.Focus,
          army: army?.slot,
          mageId: player.welcome.mageId,
          name: "Ash",
        },
      ]);
      const [snapshot] = watcher.of(ServerMessageType.Snapshot);
      expect(snapshot?.entities.map((entity) => entity.id)).toContain(
        player.welcome.mageId,
      );
      expect(watcher.of(ServerMessageType.Leaderboard)[0]?.rank).toBe(0);
    });
    expect(bench.world.armies.size).toBe(1);
    expect(army?.mage.targetX).not.toBe(1);
    expect(watcher.of(ServerMessageType.Status)).toHaveLength(0);
    player.socket.close();
    watcher.socket.close();
  });

  test("spectators are refused beyond the limit", async () => {
    await sockets.close();
    await new Promise((resolve) => server.close(resolve));
    await start((config) => {
      config.lobby.spectators.max = 1;
    });
    const first = await connect();
    first.send({ type: ClientMessageType.Spectate });
    await vi.waitFor(() => {
      expect(first.of(ServerMessageType.Welcome)).toHaveLength(1);
    });
    const second = await connect();
    second.send({ type: ClientMessageType.Spectate });
    await vi.waitFor(() => {
      expect(second.of(ServerMessageType.Rejected)).toEqual([
        { type: ServerMessageType.Rejected, reason: JoinRejection.Full },
      ]);
    });
    first.socket.close();
    second.socket.close();
  });
});
