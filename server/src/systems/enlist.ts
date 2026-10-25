import type { Army, Remains, Unit, World } from "../world/world.js";
import { grantSouls } from "./souls.js";
import { effectsOf } from "./tactics.js";

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
): Unit | undefined => {
  if (isFull(world, army)) {
    absorb(world, army, remains);
    return undefined;
  }
  const unit = world.addUnit(army, remains.type, x, y, remains.item);
  unit.raisedAt = world.time;
  return unit;
};

export const enlistNearMage = (
  world: World,
  army: Army,
  remains: Remains,
): Unit | undefined => {
  const { raiseRadius } = world.config.gameplay.reanimation;
  const { x, y } = world.randomNear(army.mage.x, army.mage.y, raiseRadius);
  return enlist(world, army, remains, x, y);
};

export const armyPace = (world: World, army: Army): number => {
  const { from, to, penalty } = world.config.gameplay.army.slowdown;
  const progress = Math.min(
    Math.max((army.units.size - from) / (to - from), 0),
    1,
  );
  return (1 - penalty * progress) * effectsOf(world, army).speed;
};
