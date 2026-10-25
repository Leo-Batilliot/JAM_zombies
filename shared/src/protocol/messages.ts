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
  Choose,
  Cast,
  Respawn,
  Demo,
  Spectate,
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
  Loot,
  Focus,
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
  Cross,
  Projectile,
  Mist,
  Camp,
  Bombing,
}

export enum CardKind {
  Mutation = 1,
  Gift,
  Spell,
}

export interface Card {
  kind: CardKind;
  index: number;
}

export interface RunStats {
  maxPower: number;
  survivalSec: number;
  infected: number;
  kills: number;
  mageKills: number;
  level: number;
  mutations: number[];
}

export enum EntityFlag {
  Fighting = 1,
  Rising = 2,
  Searched = 4,
  Waiting = 8,
  Abandoned = 16,
}

export const levelShift = 5;
export const maxFlagLevel = 7;

export const levelFlags = (level: number): number =>
  Math.min(Math.max(Math.floor(level), 0), maxFlagLevel) << levelShift;

export const flagLevel = (flags: number): number => flags >> levelShift;

export enum BattleFlag {
  InBattle = 1,
}

export const neutralArmy = 0;

export const spectatorMageId = 0;

export enum JoinRejection {
  InvalidName = 1,
  Full,
}

export type ClientMessage =
  | { type: ClientMessageType.Join; name: string; token: string; skin: number }
  | { type: ClientMessageType.View; width: number; height: number }
  | { type: ClientMessageType.Move; x: number; y: number }
  | { type: ClientMessageType.Target; entityId: number }
  | { type: ClientMessageType.Formation; formation: number }
  | { type: ClientMessageType.Choose; card: number }
  | { type: ClientMessageType.Cast }
  | { type: ClientMessageType.Respawn }
  | { type: ClientMessageType.Demo; command: DemoCommand }
  | { type: ClientMessageType.Spectate };

export const hpSteps = 0xff;

export const quantizeHp = (ratio: number): number =>
  Math.ceil(Math.min(Math.max(ratio, 0), 1) * hpSteps);

export interface SnapshotEntity {
  id: number;
  kind: EntityKind;
  type: number;
  army: number;
  flags: number;
  hp: number;
  x: number;
  y: number;
}

export interface SnapshotUpdate {
  id: number;
  flags: number;
  hp: number;
  x: number;
  y: number;
}

export interface LeaderboardEntry {
  army: number;
  name: string;
  strength: number;
  potential: number;
}

export interface CrossStrength {
  id: number;
  strength: number;
}

export interface Bounty {
  army: number;
  x: number;
  y: number;
}

export interface BossHealth {
  event: number;
  hp: number;
  maxHp: number;
}

export interface MageSighting {
  army: number;
  x: number;
  y: number;
}

export interface ChampionSighting {
  champion: number;
  x: number;
  y: number;
}

export interface Status {
  army: number;
  hp: number;
  maxHp: number;
  level: number;
  souls: number;
  levelSouls: number;
  nextSouls: number;
  units: number;
  strength: number;
  potential: number;
  pace: number;
  battle: number;
  search: number;
  formation: number;
  formationCooldown: number;
  cards: Card[];
  spell: number;
  spellCooldown: number;
  vision: number;
  crosses: CrossStrength[];
  bosses: BossHealth[];
  mages: MageSighting[];
  champions: ChampionSighting[];
}

export type ServerMessage =
  | { type: ServerMessageType.Welcome; mageId: number; token: string }
  | { type: ServerMessageType.Rejected; reason: JoinRejection }
  | { type: ServerMessageType.Config; config: ClientConfig }
  | {
      type: ServerMessageType.Snapshot;
      tick: number;
      entities: SnapshotEntity[];
      updates: SnapshotUpdate[];
      removed: number[];
    }
  | { type: ServerMessageType.Died; killer: string; stats: RunStats }
  | {
      type: ServerMessageType.Leaderboard;
      rank: number;
      total: number;
      entries: LeaderboardEntry[];
      bounty: Bounty;
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
    }
  | { type: ServerMessageType.Loot; item: number }
  | {
      type: ServerMessageType.Focus;
      army: number;
      mageId: number;
      name: string;
    };

const snapshotEntityBytes = 13;
const snapshotUpdateBytes = 10;
const searchSteps = 0xff;
const visionSteps = 100;

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
      writer
        .shortString(message.name)
        .shortString(message.token)
        .uint8(message.skin);
      break;
    case ClientMessageType.View:
      writer.float32(message.width).float32(message.height);
      break;
    case ClientMessageType.Move:
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
    case ClientMessageType.Choose:
      writer.uint8(message.card);
      break;
    case ClientMessageType.Cast:
    case ClientMessageType.Respawn:
      break;
    case ClientMessageType.Demo:
      writer.uint8(message.command);
      break;
    case ClientMessageType.Spectate:
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
        skin: reader.uint8(),
      };
      break;
    case ClientMessageType.View:
      message = { type, width: reader.float32(), height: reader.float32() };
      break;
    case ClientMessageType.Move:
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
    case ClientMessageType.Choose:
      message = { type, card: reader.uint8() };
      break;
    case ClientMessageType.Cast:
    case ClientMessageType.Respawn:
      message = { type };
      break;
    case ClientMessageType.Demo:
      message = {
        type,
        command: readEnum(reader.uint8(), DemoCommand, "demo command"),
      };
      break;
    case ClientMessageType.Spectate:
      message = { type };
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
      if (
        Math.max(
          message.entities.length,
          message.updates.length,
          message.removed.length,
        ) > 0xffff
      ) {
        throw new ProtocolError("Too many entities in snapshot");
      }
      const writer = new ByteWriter(
        11 +
          message.entities.length * snapshotEntityBytes +
          message.updates.length * snapshotUpdateBytes +
          message.removed.length * 4,
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
          .uint8(entity.hp)
          .uint16(quantizeX(entity.x, bounds))
          .uint16(quantizeY(entity.y, bounds));
      }
      writer.uint16(message.updates.length);
      for (const update of message.updates) {
        writer
          .uint32(update.id)
          .uint8(update.flags)
          .uint8(update.hp)
          .uint16(quantizeX(update.x, bounds))
          .uint16(quantizeY(update.y, bounds));
      }
      writer.uint16(message.removed.length);
      for (const id of message.removed) {
        writer.uint32(id);
      }
      return writer.finish();
    }
    case ServerMessageType.Died: {
      const { stats } = message;
      if (stats.mutations.length > 0xff) {
        throw new ProtocolError("Too many mutations");
      }
      const writer = new ByteWriter(48)
        .uint8(message.type)
        .shortString(message.killer)
        .uint32(stats.maxPower)
        .uint32(Math.floor(stats.survivalSec))
        .uint32(stats.infected)
        .uint32(stats.kills)
        .uint16(stats.mageKills)
        .uint16(stats.level)
        .uint8(stats.mutations.length);
      for (const mutation of stats.mutations) {
        writer.uint8(mutation);
      }
      return writer.finish();
    }
    case ServerMessageType.Leaderboard: {
      if (message.entries.length > 0xff) {
        throw new ProtocolError("Too many leaderboard entries");
      }
      const writer = new ByteWriter(64)
        .uint8(message.type)
        .uint16(message.rank)
        .uint16(message.total)
        .uint8(message.bounty.army)
        .uint16(quantizeX(message.bounty.x, bounds))
        .uint16(quantizeY(message.bounty.y, bounds))
        .uint8(message.entries.length);
      for (const entry of message.entries) {
        writer
          .uint8(entry.army)
          .uint32(entry.strength)
          .uint32(entry.potential)
          .shortString(entry.name);
      }
      return writer.finish();
    }
    case ServerMessageType.Status: {
      if (
        Math.max(
          message.cards.length,
          message.crosses.length,
          message.bosses.length,
          message.mages.length,
          message.champions.length,
        ) > 0xff
      ) {
        throw new ProtocolError("Too many status entries");
      }
      const writer = new ByteWriter(
        52 +
          message.cards.length * 2 +
          message.crosses.length * 6 +
          message.bosses.length * 9 +
          message.mages.length * 5 +
          message.champions.length * 5,
      )
        .uint8(message.type)
        .uint8(message.army)
        .uint32(Math.ceil(Math.max(message.hp, 0)))
        .uint32(Math.ceil(message.maxHp))
        .uint16(message.level)
        .uint32(Math.floor(message.souls))
        .uint32(Math.floor(message.levelSouls))
        .uint32(Math.ceil(message.nextSouls))
        .uint16(message.units)
        .uint32(message.strength)
        .uint32(message.potential)
        .uint8(quantizeHp(message.pace))
        .uint8(message.battle)
        .uint8(
          Math.round(Math.min(Math.max(message.search, 0), 1) * searchSteps),
        )
        .uint8(message.formation)
        .uint8(
          Math.round(
            Math.min(Math.max(message.formationCooldown, 0), 1) * searchSteps,
          ),
        )
        .uint8(message.spell)
        .uint8(
          Math.round(
            Math.min(Math.max(message.spellCooldown, 0), 1) * searchSteps,
          ),
        )
        .uint16(Math.round(message.vision * visionSteps))
        .uint8(message.cards.length);
      for (const card of message.cards) {
        writer.uint8(card.kind).uint8(card.index);
      }
      writer.uint8(message.crosses.length);
      for (const entry of message.crosses) {
        writer.uint32(entry.id).uint16(Math.min(entry.strength, 0xffff));
      }
      writer.uint8(message.bosses.length);
      for (const boss of message.bosses) {
        writer
          .uint8(boss.event)
          .uint32(Math.ceil(Math.max(boss.hp, 0)))
          .uint32(Math.ceil(boss.maxHp));
      }
      writer.uint8(message.mages.length);
      for (const mage of message.mages) {
        writer
          .uint8(mage.army)
          .uint16(quantizeX(mage.x, bounds))
          .uint16(quantizeY(mage.y, bounds));
      }
      writer.uint8(message.champions.length);
      for (const champion of message.champions) {
        writer
          .uint8(champion.champion)
          .uint16(quantizeX(champion.x, bounds))
          .uint16(quantizeY(champion.y, bounds));
      }
      return writer.finish();
    }
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
    case ServerMessageType.Loot:
      return new ByteWriter(2).uint8(message.type).uint8(message.item).finish();
    case ServerMessageType.Focus:
      return new ByteWriter(24)
        .uint8(message.type)
        .uint8(message.army)
        .uint32(message.mageId)
        .shortString(message.name)
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
          hp: reader.uint8(),
          x: dequantizeX(reader.uint16(), snapshotBounds),
          y: dequantizeY(reader.uint16(), snapshotBounds),
        });
      }
      const updates: SnapshotUpdate[] = [];
      const updateCount = reader.uint16();
      for (let index = 0; index < updateCount; index++) {
        updates.push({
          id: reader.uint32(),
          flags: reader.uint8(),
          hp: reader.uint8(),
          x: dequantizeX(reader.uint16(), snapshotBounds),
          y: dequantizeY(reader.uint16(), snapshotBounds),
        });
      }
      const removed: number[] = [];
      const removedCount = reader.uint16();
      for (let index = 0; index < removedCount; index++) {
        removed.push(reader.uint32());
      }
      message = { type, tick, entities, updates, removed };
      break;
    }
    case ServerMessageType.Died: {
      const killer = reader.shortString();
      const stats: RunStats = {
        maxPower: reader.uint32(),
        survivalSec: reader.uint32(),
        infected: reader.uint32(),
        kills: reader.uint32(),
        mageKills: reader.uint16(),
        level: reader.uint16(),
        mutations: [],
      };
      const count = reader.uint8();
      for (let index = 0; index < count; index++) {
        stats.mutations.push(reader.uint8());
      }
      message = { type, killer, stats };
      break;
    }
    case ServerMessageType.Leaderboard: {
      const rank = reader.uint16();
      const total = reader.uint16();
      const leaderBounds = requireBounds(bounds);
      const bounty = {
        army: reader.uint8(),
        x: dequantizeX(reader.uint16(), leaderBounds),
        y: dequantizeY(reader.uint16(), leaderBounds),
      };
      const count = reader.uint8();
      const entries: LeaderboardEntry[] = [];
      for (let index = 0; index < count; index++) {
        entries.push({
          army: reader.uint8(),
          strength: reader.uint32(),
          potential: reader.uint32(),
          name: reader.shortString(),
        });
      }
      message = { type, rank, total, entries, bounty };
      break;
    }
    case ServerMessageType.Status: {
      const statusBounds = requireBounds(bounds);
      const fields = {
        army: reader.uint8(),
        hp: reader.uint32(),
        maxHp: reader.uint32(),
        level: reader.uint16(),
        souls: reader.uint32(),
        levelSouls: reader.uint32(),
        nextSouls: reader.uint32(),
        units: reader.uint16(),
        strength: reader.uint32(),
        potential: reader.uint32(),
        pace: reader.uint8() / hpSteps,
        battle: reader.uint8(),
        search: reader.uint8() / searchSteps,
        formation: reader.uint8(),
        formationCooldown: reader.uint8() / searchSteps,
        spell: reader.uint8(),
        spellCooldown: reader.uint8() / searchSteps,
        vision: reader.uint16() / visionSteps,
      };
      const cards: Card[] = [];
      const cardCount = reader.uint8();
      for (let index = 0; index < cardCount; index++) {
        cards.push({
          kind: readEnum(reader.uint8(), CardKind, "card kind"),
          index: reader.uint8(),
        });
      }
      const crosses: CrossStrength[] = [];
      const crossCount = reader.uint8();
      for (let index = 0; index < crossCount; index++) {
        crosses.push({ id: reader.uint32(), strength: reader.uint16() });
      }
      const bosses: BossHealth[] = [];
      const bossCount = reader.uint8();
      for (let index = 0; index < bossCount; index++) {
        bosses.push({
          event: reader.uint8(),
          hp: reader.uint32(),
          maxHp: reader.uint32(),
        });
      }
      const mages: MageSighting[] = [];
      const mageCount = reader.uint8();
      for (let index = 0; index < mageCount; index++) {
        mages.push({
          army: reader.uint8(),
          x: dequantizeX(reader.uint16(), statusBounds),
          y: dequantizeY(reader.uint16(), statusBounds),
        });
      }
      const champions: ChampionSighting[] = [];
      const championCount = reader.uint8();
      for (let index = 0; index < championCount; index++) {
        champions.push({
          champion: reader.uint8(),
          x: dequantizeX(reader.uint16(), statusBounds),
          y: dequantizeY(reader.uint16(), statusBounds),
        });
      }
      message = {
        type,
        ...fields,
        cards,
        crosses,
        bosses,
        mages,
        champions,
      };
      break;
    }
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
    case ServerMessageType.Loot:
      message = { type, item: reader.uint8() };
      break;
    case ServerMessageType.Focus:
      message = {
        type,
        army: reader.uint8(),
        mageId: reader.uint32(),
        name: reader.shortString(),
      };
      break;
  }
  reader.end();
  return message;
};
