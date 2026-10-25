import { armyPotential, armyStrength } from "../systems/strength.js";
import type { Army, World } from "../world/world.js";

export const strongestHuman = (world: World): number => {
  let strongest = 0;
  for (const army of world.armies.values()) {
    if (army.bot === undefined && army.alive) {
      strongest = Math.max(strongest, armyStrength(world, army));
    }
  }
  return strongest;
};

export const botCap = (world: World): number => {
  const { margin, ratio } = world.config.lobby.bots.handicap;
  return strongestHuman(world) * ratio + margin;
};

export const handicapFor = (
  world: World,
  strength: number,
  cap: number,
): number => {
  const span = cap * (1 - world.config.lobby.bots.handicap.slowFrom);
  return span > 0 ? Math.min(Math.max((cap - strength) / span, 0), 1) : 0;
};

export const updateHandicaps = (world: World): void => {
  const cap = botCap(world);
  for (const army of world.armies.values()) {
    if (army.bot !== undefined) {
      army.bot.handicap = handicapFor(world, armyPotential(world, army), cap);
    }
  }
};

export const growthFactor = (army: Army): number => army.bot?.handicap ?? 1;

export const isCapped = (army: Army): boolean => growthFactor(army) <= 0;
