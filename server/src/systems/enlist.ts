import type { Army, Remains, Unit, World } from "../world/world.js";

export const enlist = (
  world: World,
  army: Army,
  remains: Remains,
  x: number,
  y: number,
): Unit | undefined => {
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
