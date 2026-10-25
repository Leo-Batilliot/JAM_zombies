import type { Config } from "@horde/shared";
import type { Army, World } from "../world/world.js";

export type Formation = Config["formations"]["neutral"];

export const formationIds = (world: World): string[] =>
  Object.keys(world.config.formations.selectable);

export const effectsOf = (world: World, army: Army): Formation =>
  (army.formation === undefined
    ? undefined
    : world.config.formations.selectable[army.formation]) ??
  world.config.formations.neutral;

export const formationIndex = (world: World, id: string | undefined): number =>
  id === undefined ? 0 : formationIds(world).indexOf(id) + 1;

export const formationCooldown = (world: World, army: Army): number => {
  const { cooldownSec } = world.config.formations;
  return cooldownSec <= 0
    ? 0
    : Math.max(0, army.formationReadyAt - world.time) / cooldownSec;
};

export const orderFormation = (
  world: World,
  army: Army,
  id: string | undefined,
): boolean => {
  if (
    !army.alive ||
    id === undefined ||
    !Object.hasOwn(world.config.formations.selectable, id) ||
    army.formation === id ||
    world.time < army.formationReadyAt
  ) {
    return false;
  }
  army.formation = id;
  army.formationReadyAt = world.time + world.config.formations.cooldownSec;
  return true;
};
