import { EntityKind } from "@horde/shared";
import { isCapped } from "../lobby/handicap.js";
import type { Army, Entity, Mage, Npc, Unit, World } from "../world/world.js";
import { distance } from "./bodies.js";
import { armyStrength, bodiesStrength } from "./strength.js";

export type Target = Mage | Unit | Npc;

const asEnemy = (
  world: World,
  army: Army,
  entity: Entity | undefined,
): Target | undefined => {
  if (entity?.kind === EntityKind.Npc) {
    return world.registries.npcs.get(entity.type).obstacle ? undefined : entity;
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
  const target = asEnemy(world, army, world.entities.get(id));
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
  const target = asEnemy(world, army, world.entities.get(army.focusId));
  if (
    target === undefined ||
    distance(target, army.mage) > world.config.gameplay.combat.orderRange
  ) {
    army.focusId = undefined;
    return undefined;
  }
  return target;
};

const leashCenter = (unit: Unit): { x: number; y: number } =>
  unit.group === undefined
    ? unit.army.mage
    : { x: unit.group.anchorX, y: unit.group.anchorY };

const fromLeash = (unit: Unit, target: Target): number => {
  const center = leashCenter(unit);
  return Math.hypot(target.x - center.x, target.y - center.y);
};

export const nearestPrey = <T extends Entity>(
  from: Entity,
  ids: number[],
  resolve: (id: number) => T | undefined,
): T | undefined => {
  let best: T | undefined;
  let bestDistance = Infinity;
  let mage: T | undefined;
  let mageDistance = Infinity;
  for (const id of ids) {
    const candidate = resolve(id);
    if (candidate === undefined) {
      continue;
    }
    const candidateDistance = distance(candidate, from);
    if (candidate.kind === EntityKind.Mage) {
      if (candidateDistance < mageDistance) {
        mage = candidate;
        mageDistance = candidateDistance;
      }
    } else if (candidateDistance < bestDistance) {
      best = candidate;
      bestDistance = candidateDistance;
    }
  }
  return best ?? mage;
};

type Strengths = Map<unknown, number>;

const cached = (
  strengths: Strengths,
  key: unknown,
  compute: () => number,
): number => {
  let strength = strengths.get(key);
  if (strength === undefined) {
    strength = compute();
    strengths.set(key, strength);
  }
  return strength;
};

const strengthOf = (world: World, army: Army, strengths: Strengths): number =>
  cached(strengths, army, () => armyStrength(world, army));

const forceStrength = (
  world: World,
  enemy: Target,
  strengths: Strengths,
): number => {
  if (enemy.kind !== EntityKind.Npc) {
    return strengthOf(world, enemy.army, strengths);
  }
  const { camp } = enemy;
  if (camp !== undefined) {
    return cached(strengths, camp, () => bodiesStrength(world, camp.defenders));
  }
  const event =
    enemy.event === undefined ? undefined : world.events.get(enemy.event);
  if (event !== undefined) {
    return cached(strengths, event, () =>
      bodiesStrength(world, [
        ...event.minions,
        ...(event.boss === undefined ? [] : [event.boss]),
      ]),
    );
  }
  return bodiesStrength(world, [enemy]);
};

const isHostile = (world: World, npc: Npc): boolean =>
  world.registries.npcs.get(npc.type).attack !== undefined;

const attacks = (world: World, enemy: Target, army: Army): boolean => {
  if (enemy.kind === EntityKind.Mage || enemy.targetId === undefined) {
    return false;
  }
  const prey = world.entities.get(enemy.targetId);
  return (
    (prey?.kind === EntityKind.Unit || prey?.kind === EntityKind.Mage) &&
    prey.army === army
  );
};

const isTempting = (
  world: World,
  unit: Unit,
  enemy: Target,
  strengths: Strengths,
): boolean => {
  if (enemy.kind === EntityKind.Npc && !isHostile(world, enemy)) {
    return !isCapped(unit.army);
  }
  const { avoidRatio, contactRange } = world.config.gameplay.combat;
  return (
    forceStrength(world, enemy, strengths) <=
      strengthOf(world, unit.army, strengths) * avoidRatio ||
    distance(unit, enemy) <= contactRange ||
    attacks(world, enemy, unit.army)
  );
};

const nearestEnemy = (
  world: World,
  unit: Unit,
  range: number,
  near: number[],
  strengths: Strengths,
): Target | undefined => {
  const { leashDistance } = world.config.gameplay.combat;
  near.length = 0;
  world.grid.queryRadius(unit.x, unit.y, range, near);
  return nearestPrey(unit, near, (id) => {
    const enemy = asEnemy(world, unit.army, world.entities.get(id));
    return enemy !== undefined &&
      fromLeash(unit, enemy) <= leashDistance &&
      isTempting(world, unit, enemy, strengths)
      ? enemy
      : undefined;
  });
};

export const currentTarget = (world: World, unit: Unit): Target | undefined =>
  unit.targetId === undefined
    ? undefined
    : asEnemy(world, unit.army, world.entities.get(unit.targetId));

export const updateTargets = (world: World): void => {
  const { retargetIntervalSec, leashDistance } = world.config.gameplay.combat;
  const near: number[] = [];
  const strengths: Strengths = new Map();
  for (const army of world.armies.values()) {
    const focus = focusTarget(world, army);
    for (const unit of army.units) {
      if (focus !== undefined && unit.group === undefined) {
        unit.targetId = focus.id;
        continue;
      }
      const { aggroRange } = world.registries.units.get(unit.type);
      const target = currentTarget(world, unit);
      if (
        target === undefined ||
        (!unit.fighting && fromLeash(unit, target) > leashDistance) ||
        distance(target, unit) > aggroRange
      ) {
        unit.targetId = undefined;
      }
      if (world.time >= unit.retargetAt) {
        unit.retargetAt =
          world.time + retargetIntervalSec * (0.5 + world.random());
        unit.targetId =
          nearestEnemy(world, unit, aggroRange, near, strengths)?.id ??
          (unit.fighting ? unit.targetId : undefined);
      }
    }
  }
};
