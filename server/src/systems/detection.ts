import type { ChampionSighting, MageSighting } from "@horde/shared";
import type { Army, World } from "../world/world.js";
import { distance } from "./bodies.js";
import { giftValue } from "./gifts.js";
import { armyStrength } from "./strength.js";

export const visionBonus = (world: World, army: Army): number =>
  1 + giftValue(world, army, "vision");

export const detectionRadius = (world: World, army: Army): number => {
  const { base, perStrength, max } = world.config.gameplay.detection;
  return (
    Math.min(max, base + perStrength * armyStrength(world, army)) *
    visionBonus(world, army)
  );
};

export const sightedMages = (world: World, army: Army): MageSighting[] => {
  if (!army.alive) {
    return [];
  }
  const radius = detectionRadius(world, army);
  const sightings: MageSighting[] = [];
  for (const other of world.armies.values()) {
    if (
      other !== army &&
      other.alive &&
      distance(other.mage, army.mage) <= radius
    ) {
      sightings.push({ army: other.slot, x: other.mage.x, y: other.mage.y });
    }
  }
  return sightings;
};

const sightingCache = new WeakMap<
  World,
  { tick: number; sightings: ChampionSighting[] }
>();

export const championSightings = (world: World): ChampionSighting[] => {
  const cached = sightingCache.get(world);
  if (cached?.tick === world.tick) {
    return cached.sightings;
  }
  const champions = Object.keys(world.config.units.champions);
  const sightings: ChampionSighting[] = [];
  const add = (type: string, x: number, y: number): void => {
    const champion = champions.indexOf(type);
    if (champion >= 0) {
      sightings.push({ champion, x, y });
    }
  };
  for (const army of world.armies.values()) {
    for (const unit of army.units) {
      add(unit.type, unit.x, unit.y);
    }
  }
  for (const npc of world.hostiles) {
    add(npc.type, npc.x, npc.y);
  }
  sightingCache.set(world, { tick: world.tick, sightings });
  return sightings;
};
