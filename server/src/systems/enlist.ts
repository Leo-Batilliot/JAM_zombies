import type { Army, Remains, World } from "../world/world.js";
import { baseRemains } from "./evolution.js";
import { grantSouls } from "./souls.js";

export const isFull = (world: World, army: Army): boolean =>
  army.units.size >= world.config.gameplay.army.cap;

export const absorb = (world: World, army: Army, remains: Remains): void => {
  grantSouls(
    world,
    army,
    world.registries.units.get(remains.type).strength *
      world.config.gameplay.souls.perStrength,
  );
  if (remains.item !== undefined) {
    army.inventory.push(remains.item);
  }
};

export const enlist = (
  world: World,
  army: Army,
  remains: Remains,
  x: number,
  y: number,
): void => {
  for (const part of baseRemains(world, army, remains)) {
    if (isFull(world, army)) {
      absorb(world, army, part);
    } else {
      world.addUnit(army, part.type, x, y, part.item).raisedAt = world.time;
    }
  }
};

export const enlistNearMage = (
  world: World,
  army: Army,
  remains: Remains,
): void => {
  const { raiseRadius } = world.config.gameplay.reanimation;
  const { x, y } = world.randomNear(army.mage.x, army.mage.y, raiseRadius);
  enlist(world, army, remains, x, y);
};
