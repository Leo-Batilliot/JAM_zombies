import { describe, expect, test } from "vitest";
import {
  ClientMessageType,
  DemoCommand,
  BattleFlag,
  EntityFlag,
  EntityKind,
  JoinRejection,
  ServerMessageType,
  decodeClientMessage,
  decodeServerMessage,
  encodeClientMessage,
  encodeServerMessage,
  maxFlagLevel,
  levelFlags,
  flagLevel,
  type ClientMessage,
  type ServerMessage,
} from "../../src/protocol/messages.js";
import {
  ByteReader,
  ByteWriter,
  ProtocolError,
} from "../../src/protocol/bytes.js";

const bounds = { width: 400, height: 300 };
const step = 400 / 0xffff;

const clientMessages: ClientMessage[] = [
  { type: ClientMessageType.Join, name: "Léa la nécro", token: "" },
  { type: ClientMessageType.Join, name: "Ash", token: "00ff" },
  { type: ClientMessageType.View, width: 80, height: 45 },
  { type: ClientMessageType.Move, x: 120.5, y: 33.25 },
  { type: ClientMessageType.Target, entityId: 123456 },
  { type: ClientMessageType.Formation, formation: 3 },
  { type: ClientMessageType.Retreat, x: 0, y: 300 },
  { type: ClientMessageType.Evolve, evolution: "fat-zombie" },
  { type: ClientMessageType.Demo, command: DemoCommand.Boss },
];

const serverMessages: ServerMessage[] = [
  {
    type: ServerMessageType.Status,
    army: 7,
    hp: 85,
    maxHp: 140,
    level: 3,
    souls: 42,
    units: 23,
    strength: 31,
    battle: 0,
    circles: [],
  },
  {
    type: ServerMessageType.Status,
    army: 2,
    hp: 10,
    maxHp: 100,
    level: 1,
    souls: 0,
    units: 4,
    strength: 4,
    battle: BattleFlag.InBattle | BattleFlag.Encircled,
    circles: [
      { x: 120, y: 80, radius: 17.25 },
      { x: 0, y: 300, radius: 8 },
    ],
  },
  { type: ServerMessageType.Died, killer: "Evil Ash" },
  { type: ServerMessageType.Welcome, mageId: 42, token: "a1b2" },
  {
    type: ServerMessageType.Leaderboard,
    rank: 12,
    total: 40,
    entries: [
      { army: 3, name: "Ash", strength: 150 },
      { army: 200, name: "Léa", strength: 70000 },
    ],
  },
  { type: ServerMessageType.Rejected, reason: JoinRejection.InvalidName },
  { type: ServerMessageType.Rejected, reason: JoinRejection.Full },
  {
    type: ServerMessageType.Config,
    config: {
      client: {
        maxPixelRatio: 2,
        pixelsPerMeter: 24,
        markerDurationMs: 600,
        pickRadius: 1,
        armyColors: ["#ff0000"],
        walkFrameMs: 150,
        attackFrameMs: 200,
        deathMs: 900,
        soulBobMs: 1200,
        grimoireBobMs: 1600,
        audio: {
          masterVolume: 1,
          musicVolume: 0.5,
          effectsVolume: 0.5,
          fadeSec: 1,
          combatFullUnits: 20,
          music: {
            exploration: "audio/a.mp3",
            combat: "audio/b.mp3",
            boss: "audio/c.mp3",
          },
          effects: {
            hit: { url: "audio/hit.mp3", volume: 1, gapMs: 100 },
            death: { url: "audio/death.mp3", volume: 1, gapMs: 100 },
            rise: { url: "audio/rise.mp3", volume: 1, gapMs: 100 },
            scream: { url: "audio/scream.mp3", volume: 1, gapMs: 0 },
            boss: { url: "audio/boss.mp3", volume: 1, gapMs: 0 },
          },
        },
        screamer: { image: "face.png", durationMs: 800, vibrateMs: [200] },
        announceMs: 4000,
        arrowMargin: 40,
        demoKeys: { screamer: "k", boss: "p", units: "u" },
        retreatKey: "r",
        sizeScaleStep: 0.25,
        aggroPulseMs: 900,
        lootMs: 2500,
        minimapSize: 110,
      },
      world: {
        width: 400,
        height: 300,
        decor: {
          seed: 1,
          scattered: [{ sprite: "decor-tree", count: 3 }],
          fixed: [{ sprite: "decor-winchester", x: 10, y: 20 }],
        },
        crosses: {
          count: 2,
          radius: 6,
          threshold: 40,
          rechargeSec: 60,
          spacing: 50,
          lifetimeSec: { min: 480, max: 720 },
        },
      },
      network: { tickRate: 20, interpolationDelayMs: 100 },
      gameplay: { riseSec: 0.8 },
      content: {
        units: [
          {
            id: "zombie",
            name: "Zombie",
            equipment: "melee",
            evolutions: [{ into: "big-zombie", cost: 5 }],
          },
          { id: "big-zombie", name: "Big zombie", evolutions: [] },
        ],
        items: [{ id: "shovel", name: "Shovel", category: "melee" }],
        npcs: ["civilian"],
        pointsOfInterest: ["mass-grave"],
        events: [{ id: "pumpkin", name: "the Evil Pumpkin" }],
      },
    },
  },
  {
    type: ServerMessageType.EventStarted,
    event: 2,
    x: 120,
    y: 80,
  },
  {
    type: ServerMessageType.EventEnded,
    event: 0,
    defeated: true,
    souls: 137,
  },
  {
    type: ServerMessageType.Snapshot,
    tick: 99999,
    entities: [
      {
        id: 1,
        kind: EntityKind.Mage,
        type: 0,
        army: 3,
        flags: 0,
        x: 10,
        y: 20,
      },
      {
        id: 70000,
        kind: EntityKind.Unit,
        type: 2,
        army: 255,
        flags: 5,
        x: 399.9,
        y: 0.1,
      },
    ],
    updates: [{ id: 5, flags: EntityFlag.Abandoned, x: 33.3, y: 44.4 }],
    removed: [9, 70001],
  },
];

const expectClose = (actual: unknown, expected: unknown): void => {
  if (typeof expected === "number") {
    expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(step);
  } else if (typeof expected === "object" && expected !== null) {
    for (const [key, value] of Object.entries(expected)) {
      expectClose((actual as Record<string, unknown>)[key], value);
    }
  } else {
    expect(actual).toBe(expected);
  }
};

describe("client messages", () => {
  test.each(clientMessages)("round trip of type $type", (message) => {
    expectClose(
      decodeClientMessage(encodeClientMessage(message, bounds), bounds),
      message,
    );
  });

  test("clamps positions to the map", () => {
    const decoded = decodeClientMessage(
      encodeClientMessage(
        { type: ClientMessageType.Move, x: -50, y: 9999 },
        bounds,
      ),
      bounds,
    );
    expect(decoded).toEqual({ type: ClientMessageType.Move, x: 0, y: 300 });
  });
});

describe("server messages", () => {
  test.each(serverMessages)("round trip of type $type", (message) => {
    expectClose(
      decodeServerMessage(encodeServerMessage(message, bounds), bounds),
      message,
    );
  });

  test("a new entity takes 12 bytes, an update 9 and a removal 4", () => {
    const empty = encodeServerMessage(
      {
        type: ServerMessageType.Snapshot,
        tick: 1,
        entities: [],
        updates: [],
        removed: [],
      },
      bounds,
    );
    const changes = encodeServerMessage(
      {
        type: ServerMessageType.Snapshot,
        tick: 1,
        entities: [],
        updates: [{ id: 1, flags: 0, x: 1, y: 1 }],
        removed: [2],
      },
      bounds,
    );
    expect(changes.byteLength - empty.byteLength).toBe(13);
    const one = encodeServerMessage(
      {
        type: ServerMessageType.Snapshot,
        tick: 1,
        updates: [],
        removed: [],
        entities: [
          {
            id: 1,
            kind: EntityKind.Mage,
            type: 0,
            army: 1,
            flags: 0,
            x: 1,
            y: 1,
          },
        ],
      },
      bounds,
    );
    expect(one.byteLength - empty.byteLength).toBe(12);
  });
});

describe("size level", () => {
  test("is stored above the other flags and capped", () => {
    expect(flagLevel(levelFlags(3) | EntityFlag.Searched)).toBe(3);
    expect(levelFlags(3) & 0x1f).toBe(0);
    expect(flagLevel(levelFlags(99))).toBe(maxFlagLevel);
    expect(levelFlags(-1)).toBe(0);
  });
});

describe("invalid data", () => {
  test.each([
    ["empty", []],
    ["unknown type", [0xee]],
    ["truncated", [ClientMessageType.Move, 0x01]],
    ["trailing bytes", [ClientMessageType.Formation, 1, 2]],
    ["invalid UTF-8", [ClientMessageType.Join, 1, 0xff]],
    ["unknown demo command", [ClientMessageType.Demo, 0x7f]],
  ])("rejects %s", (_label, bytes) => {
    expect(() => decodeClientMessage(new Uint8Array(bytes), bounds)).toThrow(
      ProtocolError,
    );
  });

  test("rejects a position before the config", () => {
    expect(() =>
      encodeClientMessage(
        { type: ClientMessageType.Move, x: 1, y: 1 },
        undefined,
      ),
    ).toThrow(ProtocolError);
  });

  test("rejects a snapshot before the config", () => {
    const data = encodeServerMessage(
      {
        type: ServerMessageType.Snapshot,
        tick: 1,
        entities: [],
        updates: [],
        removed: [],
      },
      bounds,
    );
    expect(() => decodeServerMessage(data, undefined)).toThrow(ProtocolError);
  });

  test("rejects an invalid config", () => {
    const data = encodeServerMessage(
      {
        type: ServerMessageType.Config,
        config: { client: {} } as never,
      },
      bounds,
    );
    expect(() => decodeServerMessage(data, bounds)).toThrow(ProtocolError);
  });
});

describe("ByteWriter", () => {
  test("grows past its initial capacity on any write", () => {
    const writer = new ByteWriter(1).uint8(1).uint16(2).uint32(3).float32(4);
    const reader = new ByteReader(writer.finish());
    expect([
      reader.uint8(),
      reader.uint16(),
      reader.uint32(),
      reader.float32(),
    ]).toEqual([1, 2, 3, 4]);
    reader.end();
  });
});
