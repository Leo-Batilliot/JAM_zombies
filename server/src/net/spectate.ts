import { rankArmies } from "../lobby/leaderboard.js";
import { mainBodies } from "../systems/battle.js";
import { bodiesStrength } from "../systems/strength.js";
import type { Army, World } from "../world/world.js";

export interface Focus {
  army: Army | undefined;
  until: number;
}

const battleSize = (world: World, army: Army): number =>
  army.battle === undefined
    ? 0
    : bodiesStrength(world, mainBodies(army)) +
      army.battle.foes.reduce(
        (total, foe) => total + bodiesStrength(world, foe.bodies),
        0,
      );

export const bestFocus = (world: World): Army | undefined => {
  let best: Army | undefined;
  let bestSize = world.config.lobby.spectators.battleStrength;
  for (const army of world.armies.values()) {
    const size = army.alive ? battleSize(world, army) : 0;
    if (size > 0 && size >= bestSize) {
      best = army;
      bestSize = size;
    }
  }
  if (best !== undefined) {
    return best;
  }
  for (const { army: slot } of rankArmies(world).entries) {
    const army = world.armies.get(slot);
    if (army?.alive === true) {
      return army;
    }
  }
  return undefined;
};

const isValid = (world: World, army: Army | undefined): boolean =>
  army !== undefined && army.alive && world.armies.get(army.slot) === army;

export const updateFocus = (world: World, focus: Focus): boolean => {
  if (isValid(world, focus.army) && world.time < focus.until) {
    return false;
  }
  const next = bestFocus(world);
  if (next === focus.army) {
    return false;
  }
  focus.army = next;
  focus.until = world.time + world.config.lobby.spectators.holdSec;
  return true;
};
