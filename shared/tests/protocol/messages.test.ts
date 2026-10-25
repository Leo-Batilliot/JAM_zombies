import { describe, expect, test } from "vitest";
import {
  ClientMessageType,
  DemoCommand,
  BattleFlag,
  CardKind,
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
  { type: ClientMessageType.Join, name: "Léa la nécro", token: "", skin: 0 },
  { type: ClientMessageType.Join, name: "Ash", token: "00ff", skin: 3 },
  { type: ClientMessageType.View, width: 80, height: 45 },
  { type: ClientMessageType.Move, x: 120.5, y: 33.25 },
  { type: ClientMessageType.Target, entityId: 123456 },
  { type: ClientMessageType.Formation, formation: 3 },
  { type: ClientMessageType.Choose, card: 2 },
  { type: ClientMessageType.Cast },
  { type: ClientMessageType.Respawn },
  { type: ClientMessageType.Demo, command: DemoCommand.Boss },
  { type: ClientMessageType.Spectate },
];

const serverMessages: ServerMessage[] = [
  {
    type: ServerMessageType.Status,
    army: 7,
    hp: 85,
    maxHp: 140,
    level: 3,
    souls: 42,
    levelSouls: 25,
    nextSouls: 48,
    units: 23,
    strength: 31,
    potential: 40,
    pace: 0.9,
    battle: 0,
    search: 0,
    formation: 0,
    formationCooldown: 0,
    cards: [],
    spell: 0,
    spellCooldown: 0,
    vision: 1,
    crosses: [],
    bosses: [],
    mages: [],
  },
  {
    type: ServerMessageType.Status,
    army: 2,
    hp: 10,
    maxHp: 100,
    level: 1,
    souls: 0,
    levelSouls: 0,
    nextSouls: 10,
    units: 4,
    strength: 4,
    potential: 4,
    pace: 1,
    battle: BattleFlag.InBattle,
    search: 0.4,
    formation: 3,
    formationCooldown: 0.4,
    cards: [
      { kind: CardKind.Mutation, index: 4 },
      { kind: CardKind.Gift, index: 0 },
      { kind: CardKind.Spell, index: 3 },
    ],
    spell: 2,
    spellCooldown: 0.5,
    vision: 1.4,
    crosses: [{ id: 70000, strength: 12 }],
    bosses: [{ event: 0, hp: 1234, maxHp: 5000 }],
    mages: [
      { army: 3, x: 120, y: 80 },
      { army: 9, x: 0, y: 300 },
    ],
  },
  { type: ServerMessageType.Loot, item: 2 },
  { type: ServerMessageType.Focus, army: 4, mageId: 70123, name: "Léa" },
  { type: ServerMessageType.Focus, army: 0, mageId: 0, name: "" },
  {
    type: ServerMessageType.Died,
    killer: "Evil Ash",
    stats: {
      maxPower: 120,
      survivalSec: 312,
      infected: 40,
      kills: 75,
      mageKills: 2,
      level: 6,
      mutations: [4, 5],
    },
  },
  { type: ServerMessageType.Welcome, mageId: 42, token: "a1b2" },
  {
    type: ServerMessageType.Leaderboard,
    rank: 12,
    total: 40,
    entries: [
      { army: 3, name: "Ash", strength: 150, potential: 180 },
      { army: 200, name: "Léa", strength: 70000, potential: 70000 },
    ],
    bounty: { army: 3, x: 120, y: 80 },
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
            blast: { url: "audio/blast.mp3", volume: 1, gapMs: 300 },
          },
        },
        screamer: { image: "face.png", durationMs: 800, vibrateMs: [200] },
        announceMs: 4000,
        arrowMargin: 40,
        demoKeys: { screamer: "k", boss: "p", units: "u" },
        sizeScaleStep: 0.25,
        hpBar: {
          width: 22,
          height: 3,
          offsetY: 3,
          growth: 0.35,
          mageScale: 1.6,
          background: "#000000",
          ally: "#00ff00",
          enemy: "#ff0000",
        },
        outline: {
          ally: "#00ff00",
          enemy: "#ff0000",
          useful: "#ffff00",
          alpha: 0.9,
        },
        plates: { offsetY: -40, fontSize: 12 },
        camera: {
          minZoom: 0.6,
          strengthScale: 100,
          factor: 0.25,
          smoothing: 0.05,
          resendRatio: 0.05,
        },
        lootMs: 2500,
        minimapSize: 110,
        gearOffsets: { melee: { x: 7, y: 2 } },
        mistColors: { necrotic: "#00ff00" },
        bombingColors: { mark: "#ff0000", blast: "#ffaa00" },
        formationKeys: ["1", "2"],
        spellKey: " ",
        spriteAliases: {
          "unit-ghoul": { sprite: "unit-zombie-dog", scale: 1.1 },
        },
        cardArtScale: 2,
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
        bombings: {
          name: "the bombing",
          firstDelaySec: 150,
          intervalSec: { min: 75, max: 120 },
          zones: 3,
          radius: 7,
          spread: 5,
          delaySec: 10,
          blastSec: 0.6,
          damage: 20,
          crowding: 0.03,
          maxMultiplier: 3,
        },
      },
      network: { tickRate: 20, interpolationDelayMs: 100 },
      gameplay: { riseSec: 0.8, leaderboardSize: 10 },
      content: {
        units: [
          {
            id: "zombie",
            name: "Zombie",
            strength: 1,
            equipment: "melee",
            hp: 30,
            damage: 5,
            attackIntervalSec: 1,
            speed: 7,
            attackRange: 0.3,
          },
          {
            id: "big-zombie",
            name: "Big zombie",
            strength: 5,
            hp: 80,
            damage: 10,
            attackIntervalSec: 1.2,
            speed: 6.5,
            attackRange: 0.3,
          },
        ],
        items: [{ id: "shovel", name: "Shovel", category: "melee" }],
        npcs: ["civilian"],
        obstacles: [],
        pointsOfInterest: ["mass-grave"],
        events: [{ id: "pumpkin", name: "the Evil Pumpkin" }],
        projectiles: ["arrow"],
        mists: [{ id: "necrotic", radius: 12 }],
        formations: [{ id: "phalanx", name: "Phalanx" }],
        lineages: [
          {
            id: "zombie",
            name: "Zombies",
            base: "zombie",
            branches: { mass: { name: "Mass", tiers: ["big-zombie"] } },
          },
        ],
        gifts: [
          {
            id: "haste",
            name: "Haste",
            effect: "speed",
            value: 0.08,
            maxStacks: 3,
          },
        ],
        spells: [
          {
            id: "bone-wall",
            name: "Bone wall",
            effect: "wall",
            cooldownSec: 25,
            durationSec: 8,
          },
        ],
        skins: [{ id: "lich", name: "Lich" }],
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
        hp: 200,
        x: 10,
        y: 20,
      },
      {
        id: 70000,
        kind: EntityKind.Unit,
        type: 2,
        army: 255,
        flags: 5,
        hp: 200,
        x: 399.9,
        y: 0.1,
      },
      {
        id: 70002,
        kind: EntityKind.Cross,
        type: 0,
        army: 0,
        flags: levelFlags(4),
        hp: 200,
        x: 200,
        y: 150,
      },
      {
        id: 70003,
        kind: EntityKind.Bombing,
        type: 0,
        army: 0,
        flags: levelFlags(7),
        hp: 200,
        x: 120,
        y: 30,
      },
    ],
    updates: [{ id: 5, flags: EntityFlag.Abandoned, hp: 17, x: 33.3, y: 44.4 }],
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

  test("a new entity takes 13 bytes, an update 10 and a removal 4", () => {
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
        updates: [{ id: 1, flags: 0, hp: 0, x: 1, y: 1 }],
        removed: [2],
      },
      bounds,
    );
    expect(changes.byteLength - empty.byteLength).toBe(14);
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
            hp: 200,
            x: 1,
            y: 1,
          },
        ],
      },
      bounds,
    );
    expect(one.byteLength - empty.byteLength).toBe(13);
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
