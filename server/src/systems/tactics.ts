import type { Config } from "@horde/shared";
import type { Army, World } from "../world/world.js";

export type Formation = Config["formations"]["neutral"];

export const formationIds = (world: World): string[] =>
  Object.keys(world.config.formations.selectable);

const formationById = (world: World, id: string | undefined): Formation =>
  (id === undefined ? undefined : world.config.formations.selectable[id]) ??
  world.config.formations.neutral;

export const layoutOf = (world: World, army: Army): Formation =>
  formationById(world, army.formation);

export const effectsOf = (world: World, army: Army): Formation =>
  army.formationChange === undefined
    ? layoutOf(world, army)
    : world.config.formations.neutral;

export const formationIndex = (world: World, id: string | undefined): number =>
  id === undefined ? 0 : formationIds(world).indexOf(id) + 1;

export const changeProgress = (world: World, army: Army): number => {
  const { changeSec } = world.config.formations;
  if (army.formationChange === undefined || changeSec <= 0) {
    return 0;
  }
  return 1 - (army.formationChange.at - world.time) / changeSec;
};

export const orderFormation = (
  world: World,
  army: Army,
  id: string | undefined,
): boolean => {
  if (
    !army.alive ||
    id === undefined ||
    !(id in world.config.formations.selectable) ||
    (army.formationChange ?? { to: army.formation }).to === id
  ) {
    return false;
  }
  army.formationChange = {
    to: id,
    at: world.time + world.config.formations.changeSec,
  };
  return true;
};

export const updateFormations = (world: World): void => {
  for (const army of world.armies.values()) {
    const change = army.formationChange;
    if (change !== undefined && world.time >= change.at) {
      army.formation = change.to;
      army.formationChange = undefined;
    }
  }
};
