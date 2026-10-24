import type { World } from "../world/world.js";
import { bodyRadius, distance } from "./bodies.js";
import { damage } from "./death.js";
import { currentTarget, type Target } from "./targeting.js";
import type { Unit } from "../world/world.js";

export const reachDistance = (
  world: World,
  unit: Unit,
  target: Target,
): number =>
  world.registries.units.get(unit.type).attackRange +
  bodyRadius(world, unit) +
  bodyRadius(world, target);

export const fight = (world: World, dt: number): void => {
  for (const army of world.armies.values()) {
    for (const unit of army.units) {
      unit.cooldown = Math.max(0, unit.cooldown - dt);
      const target = currentTarget(world, unit);
      if (
        target === undefined ||
        unit.cooldown > 0 ||
        distance(unit, target) > reachDistance(world, unit, target)
      ) {
        continue;
      }
      const stats = world.registries.units.get(unit.type);
      unit.cooldown = stats.attackIntervalSec;
      damage(world, target, stats.damage, army);
    }
  }
};
