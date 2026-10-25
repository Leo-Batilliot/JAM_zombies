import { EntityKind } from "@horde/shared";
import type { World } from "../world/world.js";
import { bodyRadius, distance } from "./bodies.js";
import { damage } from "./death.js";
import { damageBonus } from "./equipment.js";
import { rallyBonus } from "./pace.js";
import { effectsOf } from "./tactics.js";
import { currentTarget, type Target } from "./targeting.js";
import type { Unit } from "../world/world.js";

const reachTolerance = 1e-6;

export const reachDistance = (
  world: World,
  unit: Unit,
  target: Target,
): number =>
  world.registries.units.get(unit.type).attackRange +
  bodyRadius(world, unit) +
  bodyRadius(world, target);

export const familyBonus = (
  world: World,
  type: string,
  target: Target,
): number =>
  target.kind === EntityKind.Unit
    ? (world.registries.units.get(type).bonus[
        world.registries.units.get(target.type).family
      ] ?? 1)
    : 1;

const impactBonus = (world: World, unit: Unit): number => {
  const { impact } = effectsOf(world, unit.army);
  return impact !== undefined &&
    unit.group === undefined &&
    world.time - unit.contactAt <= impact.durationSec
    ? impact.damage
    : 1;
};

export const fight = (world: World, dt: number): void => {
  for (const army of world.armies.values()) {
    for (const unit of army.units) {
      unit.cooldown = Math.max(0, unit.cooldown - dt);
      const target = currentTarget(world, unit);
      const fighting =
        target !== undefined &&
        distance(unit, target) <=
          reachDistance(world, unit, target) + reachTolerance;
      if (fighting && !unit.fighting) {
        unit.contactAt = world.time;
      }
      unit.fighting = fighting;
      if (target === undefined || !unit.fighting || unit.cooldown > 0) {
        continue;
      }
      const stats = world.registries.units.get(unit.type);
      unit.cooldown = stats.attackIntervalSec;
      const amount =
        stats.damage *
        damageBonus(world, unit) *
        familyBonus(world, unit.type, target) *
        impactBonus(world, unit) *
        rallyBonus(world, army);
      if (stats.projectile === undefined) {
        damage(world, target, amount, army);
      } else {
        world.addProjectile(
          stats.projectile,
          unit,
          target.id,
          amount,
          army,
          army.name,
        );
      }
    }
  }
};
