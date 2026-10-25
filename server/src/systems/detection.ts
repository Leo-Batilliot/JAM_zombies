import type { MageSighting } from "@horde/shared";
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
