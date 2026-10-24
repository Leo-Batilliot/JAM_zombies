import { EntityKind } from "@horde/shared";
import type { Army, Entity, Mage, Npc, Unit, World } from "../world/world.js";
import { distance } from "./bodies.js";

export type Target = Mage | Unit | Npc;

export const asEnemy = (
  army: Army,
  entity: Entity | undefined,
): Target | undefined => {
  if (entity?.kind === EntityKind.Npc) {
    return entity;
  }
  if (
    (entity?.kind === EntityKind.Unit || entity?.kind === EntityKind.Mage) &&
    entity.army !== army
  ) {
    return entity;
  }
  return undefined;
};

export const orderAttack = (world: World, army: Army, id: number): boolean => {
  const target = asEnemy(army, world.entities.get(id));
  if (
    target === undefined ||
    distance(target, army.mage) > world.config.gameplay.combat.orderRange
  ) {
    return false;
  }
  army.focusId = id;
  return true;
};

const focusTarget = (world: World, army: Army): Target | undefined => {
  if (army.focusId === undefined) {
    return undefined;
  }
  const target = asEnemy(army, world.entities.get(army.focusId));
  if (
    target === undefined ||
    distance(target, army.mage) > world.config.gameplay.combat.orderRange
  ) {
    army.focusId = undefined;
    return undefined;
  }
  return target;
};

const nearestEnemy = (
  world: World,
  unit: Unit,
  range: number,
  near: number[],
): Target | undefined => {
  const { leashDistance } = world.config.gameplay.combat;
  near.length = 0;
  world.grid.queryRadius(unit.x, unit.y, range, near);
  let best: Target | undefined;
  let bestDistance = Infinity;
  for (const id of near) {
    const enemy = asEnemy(unit.army, world.entities.get(id));
    if (
      enemy === undefined ||
      distance(enemy, unit.army.mage) > leashDistance
    ) {
      continue;
    }
    const enemyDistance = distance(enemy, unit);
    if (enemyDistance < bestDistance) {
      best = enemy;
      bestDistance = enemyDistance;
    }
  }
  return best;
};

export const currentTarget = (world: World, unit: Unit): Target | undefined =>
  unit.targetId === undefined
    ? undefined
    : asEnemy(unit.army, world.entities.get(unit.targetId));

export const updateTargets = (world: World): void => {
  const { retargetIntervalSec, leashDistance } = world.config.gameplay.combat;
  const near: number[] = [];
  for (const army of world.armies.values()) {
    const focus = focusTarget(world, army);
    for (const unit of army.units) {
      if (focus !== undefined) {
        unit.targetId = focus.id;
        continue;
      }
      const { aggroRange } = world.registries.units.get(unit.type);
      const target = currentTarget(world, unit);
      if (
        target === undefined ||
        distance(target, army.mage) > leashDistance ||
        distance(target, unit) > aggroRange
      ) {
        unit.targetId = undefined;
      }
      if (world.time >= unit.retargetAt) {
        unit.retargetAt = world.time + retargetIntervalSec;
        unit.targetId = nearestEnemy(world, unit, aggroRange, near)?.id;
      }
    }
  }
};
