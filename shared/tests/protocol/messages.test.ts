import { describe, expect, test } from "vitest";
import {
  ClientMessageType,
  EntityKind,
  JoinRejection,
  ServerMessageType,
  decodeClientMessage,
  decodeServerMessage,
  encodeClientMessage,
  encodeServerMessage,
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
  { type: ClientMessageType.Demo, command: 2 },
];

const serverMessages: ServerMessage[] = [
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
      },
      world: {
        width: 400,
        height: 300,
        decor: { seed: 1, scattered: [{ sprite: "decor-tree", count: 3 }] },
      },
      network: { tickRate: 20, interpolationDelayMs: 100 },
      gameplay: { riseSec: 0.8 },
      content: {
        units: ["zombie"],
        npcs: ["civilian"],
        pointsOfInterest: ["mass-grave"],
      },
    },
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

  test("a snapshot entity takes 12 bytes", () => {
    const empty = encodeServerMessage(
      { type: ServerMessageType.Snapshot, tick: 1, entities: [] },
      bounds,
    );
    const one = encodeServerMessage(
      {
        type: ServerMessageType.Snapshot,
        tick: 1,
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

describe("invalid data", () => {
  test.each([
    ["empty", []],
    ["unknown type", [0xee]],
    ["truncated", [ClientMessageType.Move, 0x01]],
    ["trailing bytes", [ClientMessageType.Formation, 1, 2]],
    ["invalid UTF-8", [ClientMessageType.Join, 1, 0xff]],
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
      { type: ServerMessageType.Snapshot, tick: 1, entities: [] },
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
