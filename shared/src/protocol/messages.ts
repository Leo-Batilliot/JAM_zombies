import { clientConfigSchema, type ClientConfig } from "../config/schema.js";
import { ByteReader, ByteWriter, ProtocolError } from "./bytes.js";
import {
  dequantizeX,
  dequantizeY,
  quantizeX,
  quantizeY,
  type Bounds,
} from "./quantize.js";

export const socketPath = "/ws";

export enum ClientMessageType {
  Join = 1,
  View,
  Move,
  Target,
  Formation,
  Retreat,
  Evolve,
  Demo,
}

export enum ServerMessageType {
  Welcome = 1,
  Rejected,
  Config,
  Snapshot,
  Died,
  Leaderboard,
  Status,
  EventStarted,
  EventEnded,
}

export enum DemoCommand {
  Screamer = 1,
  Boss,
  Units,
}

export enum EntityKind {
  Mage = 1,
  Unit,
  Npc,
  Corpse,
  PointOfInterest,
}

export enum EntityFlag {
  Fighting = 1,
  Rising = 2,
  Searched = 4,
}

export const neutralArmy = 0;

export enum JoinRejection {
  InvalidName = 1,
  Full,
}

export type ClientMessage =
  | { type: ClientMessageType.Join; name: string; token: string }
  | { type: ClientMessageType.View; width: number; height: number }
  | { type: ClientMessageType.Move; x: number; y: number }
  | { type: ClientMessageType.Target; entityId: number }
  | { type: ClientMessageType.Formation; formation: number }
  | { type: ClientMessageType.Retreat; x: number; y: number }
  | { type: ClientMessageType.Evolve; evolution: string }
  | { type: ClientMessageType.Demo; command: DemoCommand };

export interface SnapshotEntity {
  id: number;
  kind: EntityKind;
  type: number;
  army: number;
  flags: number;
  x: number;
  y: number;
}

export interface LeaderboardEntry {
  army: number;
  name: string;
  strength: number;
}

export interface Status {
  army: number;
  hp: number;
  maxHp: number;
  level: number;
  souls: number;
  units: number;
  strength: number;
}

export type ServerMessage =
  | { type: ServerMessageType.Welcome; mageId: number; token: string }
  | { type: ServerMessageType.Rejected; reason: JoinRejection }
  | { type: ServerMessageType.Config; config: ClientConfig }
  | {
      type: ServerMessageType.Snapshot;
      tick: number;
      entities: SnapshotEntity[];
    }
  | { type: ServerMessageType.Died; killer: string }
  | {
      type: ServerMessageType.Leaderboard;
      rank: number;
      total: number;
      entries: LeaderboardEntry[];
    }
  | ({ type: ServerMessageType.Status } & Status)
  | {
      type: ServerMessageType.EventStarted;
      event: number;
      x: number;
      y: number;
    }
  | {
      type: ServerMessageType.EventEnded;
      event: number;
      defeated: boolean;
      souls: number;
    };

const snapshotEntityBytes = 12;

const readEnum = <T extends number>(
  value: number,
  values: Record<string, T | string>,
  label: string,
): T => {
  const match = Object.values(values).find((entry) => entry === value);
  if (typeof match !== "number") {
    throw new ProtocolError(`Unknown ${label} ${String(value)}`);
  }
  return match;
};

const requireBounds = (bounds: Bounds | undefined): Bounds => {
  if (bounds === undefined) {
    throw new ProtocolError("Position sent before config");
  }
  return bounds;
};

export const encodeClientMessage = (
  message: ClientMessage,
  bounds: Bounds | undefined,
): ArrayBuffer => {
  const writer = new ByteWriter(16).uint8(message.type);
  switch (message.type) {
    case ClientMessageType.Join:
      writer.shortString(message.name).shortString(message.token);
      break;
    case ClientMessageType.View:
      writer.float32(message.width).float32(message.height);
      break;
    case ClientMessageType.Move:
    case ClientMessageType.Retreat:
      writer
        .uint16(quantizeX(message.x, requireBounds(bounds)))
        .uint16(quantizeY(message.y, requireBounds(bounds)));
      break;
    case ClientMessageType.Target:
      writer.uint32(message.entityId);
      break;
    case ClientMessageType.Formation:
      writer.uint8(message.formation);
      break;
    case ClientMessageType.Evolve:
      writer.shortString(message.evolution);
      break;
    case ClientMessageType.Demo:
      writer.uint8(message.command);
      break;
  }
  return writer.finish();
};

export const decodeClientMessage = (
  data: ArrayBuffer | Uint8Array,
  bounds: Bounds,
): ClientMessage => {
  const reader = new ByteReader(data);
  const type = readEnum(reader.uint8(), ClientMessageType, "client message");
  let message: ClientMessage;
  switch (type) {
    case ClientMessageType.Join:
      message = {
        type,
        name: reader.shortString(),
        token: reader.shortString(),
      };
      break;
    case ClientMessageType.View:
      message = { type, width: reader.float32(), height: reader.float32() };
      break;
    case ClientMessageType.Move:
    case ClientMessageType.Retreat:
      message = {
        type,
        x: dequantizeX(reader.uint16(), bounds),
        y: dequantizeY(reader.uint16(), bounds),
      };
      break;
    case ClientMessageType.Target:
      message = { type, entityId: reader.uint32() };
      break;
    case ClientMessageType.Formation:
      message = { type, formation: reader.uint8() };
      break;
    case ClientMessageType.Evolve:
      message = { type, evolution: reader.shortString() };
      break;
    case ClientMessageType.Demo:
      message = {
        type,
        command: readEnum(reader.uint8(), DemoCommand, "demo command"),
      };
      break;
  }
  reader.end();
  return message;
};

export const encodeServerMessage = (
  message: ServerMessage,
  bounds: Bounds,
): ArrayBuffer => {
  switch (message.type) {
    case ServerMessageType.Welcome:
      return new ByteWriter(40)
        .uint8(message.type)
        .uint32(message.mageId)
        .shortString(message.token)
        .finish();
    case ServerMessageType.Rejected:
      return new ByteWriter(2)
        .uint8(message.type)
        .uint8(message.reason)
        .finish();
    case ServerMessageType.Config:
      return new ByteWriter(256)
        .uint8(message.type)
        .longString(JSON.stringify(message.config))
        .finish();
    case ServerMessageType.Snapshot: {
      if (message.entities.length > 0xffff) {
        throw new ProtocolError("Too many entities in snapshot");
      }
      const writer = new ByteWriter(
        7 + message.entities.length * snapshotEntityBytes,
      )
        .uint8(message.type)
        .uint32(message.tick)
        .uint16(message.entities.length);
      for (const entity of message.entities) {
        writer
          .uint32(entity.id)
          .uint8(entity.kind)
          .uint8(entity.type)
          .uint8(entity.army)
          .uint8(entity.flags)
          .uint16(quantizeX(entity.x, bounds))
          .uint16(quantizeY(entity.y, bounds));
      }
      return writer.finish();
    }
    case ServerMessageType.Died:
      return new ByteWriter(16)
        .uint8(message.type)
        .shortString(message.killer)
        .finish();
    case ServerMessageType.Leaderboard: {
      if (message.entries.length > 0xff) {
        throw new ProtocolError("Too many leaderboard entries");
      }
      const writer = new ByteWriter(64)
        .uint8(message.type)
        .uint16(message.rank)
        .uint16(message.total)
        .uint8(message.entries.length);
      for (const entry of message.entries) {
        writer.uint8(entry.army).uint32(entry.strength).shortString(entry.name);
      }
      return writer.finish();
    }
    case ServerMessageType.Status:
      return new ByteWriter(22)
        .uint8(message.type)
        .uint8(message.army)
        .uint32(Math.ceil(Math.max(message.hp, 0)))
        .uint32(Math.ceil(message.maxHp))
        .uint16(message.level)
        .uint32(Math.floor(message.souls))
        .uint16(message.units)
        .uint32(message.strength)
        .finish();
    case ServerMessageType.EventStarted:
      return new ByteWriter(6)
        .uint8(message.type)
        .uint8(message.event)
        .uint16(quantizeX(message.x, bounds))
        .uint16(quantizeY(message.y, bounds))
        .finish();
    case ServerMessageType.EventEnded:
      return new ByteWriter(7)
        .uint8(message.type)
        .uint8(message.event)
        .uint8(message.defeated ? 1 : 0)
        .uint32(Math.floor(message.souls))
        .finish();
  }
};

const parseClientConfig = (json: string): ClientConfig => {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new ProtocolError("Invalid config JSON");
  }
  const result = clientConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new ProtocolError("Invalid config message");
  }
  return result.data;
};

export const decodeServerMessage = (
  data: ArrayBuffer | Uint8Array,
  bounds: Bounds | undefined,
): ServerMessage => {
  const reader = new ByteReader(data);
  const type = readEnum(reader.uint8(), ServerMessageType, "server message");
  let message: ServerMessage;
  switch (type) {
    case ServerMessageType.Welcome:
      message = { type, mageId: reader.uint32(), token: reader.shortString() };
      break;
    case ServerMessageType.Rejected:
      message = {
        type,
        reason: readEnum(reader.uint8(), JoinRejection, "join rejection"),
      };
      break;
    case ServerMessageType.Config:
      message = { type, config: parseClientConfig(reader.longString()) };
      break;
    case ServerMessageType.Snapshot: {
      const snapshotBounds = requireBounds(bounds);
      const tick = reader.uint32();
      const count = reader.uint16();
      const entities: SnapshotEntity[] = [];
      for (let index = 0; index < count; index++) {
        entities.push({
          id: reader.uint32(),
          kind: readEnum(reader.uint8(), EntityKind, "entity kind"),
          type: reader.uint8(),
          army: reader.uint8(),
          flags: reader.uint8(),
          x: dequantizeX(reader.uint16(), snapshotBounds),
          y: dequantizeY(reader.uint16(), snapshotBounds),
        });
      }
      message = { type, tick, entities };
      break;
    }
    case ServerMessageType.Died:
      message = { type, killer: reader.shortString() };
      break;
    case ServerMessageType.Leaderboard: {
      const rank = reader.uint16();
      const total = reader.uint16();
      const count = reader.uint8();
      const entries: LeaderboardEntry[] = [];
      for (let index = 0; index < count; index++) {
        entries.push({
          army: reader.uint8(),
          strength: reader.uint32(),
          name: reader.shortString(),
        });
      }
      message = { type, rank, total, entries };
      break;
    }
    case ServerMessageType.Status:
      message = {
        type,
        army: reader.uint8(),
        hp: reader.uint32(),
        maxHp: reader.uint32(),
        level: reader.uint16(),
        souls: reader.uint32(),
        units: reader.uint16(),
        strength: reader.uint32(),
      };
      break;
    case ServerMessageType.EventStarted: {
      const eventBounds = requireBounds(bounds);
      message = {
        type,
        event: reader.uint8(),
        x: dequantizeX(reader.uint16(), eventBounds),
        y: dequantizeY(reader.uint16(), eventBounds),
      };
      break;
    }
    case ServerMessageType.EventEnded:
      message = {
        type,
        event: reader.uint8(),
        defeated: reader.uint8() !== 0,
        souls: reader.uint32(),
      };
      break;
  }
  reader.end();
  return message;
};
