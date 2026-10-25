import { randomBytes } from "node:crypto";
import { JoinRejection } from "@horde/shared";
import { spawnArmy } from "../systems/army.js";
import { createMassGrave } from "../systems/points.js";
import { armyStrength } from "../systems/strength.js";
import type { Army, Bot, World } from "../world/world.js";

const tokenBytes = 16;

export type JoinResult =
  { army: Army; token: string } | { rejection: JoinRejection };

const isReplaceable = (world: World, army: Army): boolean => {
  if (army.bot === undefined) {
    return false;
  }
  for (const reconnect of world.reconnects.values()) {
    if (reconnect.army === army) {
      return false;
    }
  }
  return true;
};

const newBot = (world: World): Bot => ({
  thinkAt: world.time,
  chase: undefined,
  ignored: new Map(),
});

const botName = (world: World): string => {
  const { names } = world.config.lobby.bots;
  const used = new Set([...world.armies.values()].map((army) => army.name));
  const free = names.find((name) => !used.has(name));
  if (free !== undefined) {
    return free;
  }
  for (let copy = 2; ; copy++) {
    const name = `${names[world.armies.size % names.length] ?? ""} ${String(copy)}`;
    if (!used.has(name)) {
      return name;
    }
  }
};

const removeBot = (world: World, army: Army): void => {
  const corpses = [...army.units, ...army.corpses].map(({ type, item }) => ({
    type,
    item,
  }));
  const { x, y } = army.mage;
  world.removeArmy(army);
  createMassGrave(world, x, y, corpses);
};

export const skinId = (world: World, index: number): string | undefined => {
  const ids = world.registries.skins.ids();
  return ids[index] ?? ids[0];
};

export const canJoin = (world: World): boolean =>
  world.armies.size < world.config.lobby.maxParticipants ||
  [...world.armies.values()].some((army) => isReplaceable(world, army));

export const hasPlayers = (world: World): boolean => world.reconnects.size > 0;

const replaceWeakestBot = (world: World): boolean => {
  let weakest: Army | undefined;
  let weakestStrength = Infinity;
  for (const army of world.armies.values()) {
    const strength = armyStrength(world, army);
    if (isReplaceable(world, army) && strength < weakestStrength) {
      weakest = army;
      weakestStrength = strength;
    }
  }
  if (weakest === undefined) {
    return false;
  }
  removeBot(world, weakest);
  return true;
};

const resume = (world: World, token: string): Army | undefined => {
  const reconnect = world.reconnects.get(token);
  if (reconnect === undefined || reconnect.army.bot === undefined) {
    return undefined;
  }
  reconnect.army.bot = undefined;
  reconnect.expiresAt = Infinity;
  return reconnect.army;
};

export const canResume = (world: World, token: string): boolean =>
  world.reconnects.get(token)?.army.bot !== undefined;

export const joinLobby = (
  world: World,
  name: string,
  token: string,
  skin?: string,
): JoinResult => {
  const resumed = resume(world, token);
  if (resumed !== undefined) {
    if (skin !== undefined) {
      resumed.skin = skin;
    }
    return { army: resumed, token };
  }
  const { minParticipants, maxParticipants } = world.config.lobby;
  if (world.armies.size >= minParticipants) {
    replaceWeakestBot(world);
  }
  if (world.armies.size >= maxParticipants) {
    return { rejection: JoinRejection.Full };
  }
  const army = spawnArmy(world, name, skin);
  const newToken = randomBytes(tokenBytes).toString("hex");
  world.reconnects.set(newToken, { army, expiresAt: Infinity });
  return { army, token: newToken };
};

export const leaveLobby = (world: World, army: Army): void => {
  army.bot = newBot(world);
  army.focusId = undefined;
  for (const reconnect of world.reconnects.values()) {
    if (reconnect.army === army) {
      reconnect.expiresAt = world.time + world.config.lobby.graceSec;
    }
  }
};

export const updateLobby = (world: World): void => {
  for (const [token, reconnect] of world.reconnects) {
    if (world.time >= reconnect.expiresAt) {
      world.reconnects.delete(token);
    }
  }
  while (world.armies.size < world.config.lobby.minParticipants) {
    spawnArmy(world, botName(world)).bot = newBot(world);
  }
};
