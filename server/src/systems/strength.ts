import { EntityKind } from "@horde/shared";
import type { Army, Body, World } from "../world/world.js";

const bodyStrength = (world: World, body: Body): number => {
  switch (body.kind) {
    case EntityKind.Mage:
      return 0;
    case EntityKind.Unit:
      return world.registries.units.get(body.type).strength;
    case EntityKind.Npc:
      return world.registries.npcs.get(body.type).strength;
  }
};

export const bodiesStrength = (
  world: World,
  bodies: Iterable<Body>,
): number => {
  let strength = 0;
  for (const body of bodies) {
    strength += bodyStrength(world, body);
  }
  return strength;
};

export const armyStrength = (world: World, army: Army): number =>
  bodiesStrength(world, army.units);

export const armyPotential = (world: World, army: Army): number => {
  let strength = armyStrength(world, army);
  for (const corpse of army.corpses) {
    strength += world.registries.units.get(corpse.type).strength;
  }
  return strength;
};
