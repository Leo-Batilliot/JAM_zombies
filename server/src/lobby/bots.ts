import { EntityKind } from "@horde/shared";
import { mainBodies } from "../systems/battle.js";
import { distance } from "../systems/bodies.js";
import { isReady } from "../systems/crosses.js";
import { evolvableCounts } from "../systems/evolution.js";
import {
  orderAttack,
  orderEvolve,
  orderMove,
  orderRetreat,
} from "../systems/orders.js";
import { armyStrength, bodiesStrength } from "../systems/strength.js";
import type {
  Army,
  Battle,
  Entity,
  PointOfInterest,
  World,
} from "../world/world.js";

const nearestPoint = (
  world: World,
  army: Army,
  range: number,
): PointOfInterest | undefined => {
  let best: PointOfInterest | undefined;
  for (const point of world.points) {
    if (
      !point.searchedBy.has(army) &&
      distance(point, army.mage) <= range &&
      (best === undefined ||
        distance(point, army.mage) < distance(best, army.mage))
    ) {
      best = point;
    }
  }
  return best;
};

const nearestCivilian = (
  world: World,
  army: Army,
  range: number,
): Entity | undefined => {
  let best: Entity | undefined;
  for (const id of world.grid.queryRadius(army.mage.x, army.mage.y, range)) {
    const entity = world.entities.get(id);
    if (
      entity?.kind === EntityKind.Npc &&
      world.registries.npcs.get(entity.type).attack === undefined &&
      (best === undefined ||
        distance(entity, army.mage) < distance(best, army.mage))
    ) {
      best = entity;
    }
  }
  return best;
};

const flee = (world: World, army: Army, battle: Battle): void => {
  const { fleeRatio, avoidSectorDeg, fleeDistance } = world.config.lobby.bots;
  const own = bodiesStrength(world, mainBodies(army));
  const foes = battle.foes.reduce(
    (total, foe) => total + bodiesStrength(world, foe.bodies),
    0,
  );
  const trapped =
    battle.freeSector < (avoidSectorDeg * Math.PI) / 180 && foes >= own;
  if (battle.encircled || (foes <= own * fleeRatio && !trapped)) {
    return;
  }
  orderRetreat(
    world,
    army,
    army.mage.x + Math.cos(battle.escapeAngle) * fleeDistance,
    army.mage.y + Math.sin(battle.escapeAngle) * fleeDistance,
  );
};

const weakerArmy = (world: World, army: Army): Army | undefined => {
  const { attackRange, attackRatio } = world.config.lobby.bots;
  const own = armyStrength(world, army);
  let best: Army | undefined;
  let bestDistance = attackRange;
  for (const other of world.armies.values()) {
    if (other === army || !other.alive) {
      continue;
    }
    const otherDistance = distance(other.mage, army.mage);
    if (
      otherDistance <= bestDistance &&
      armyStrength(world, other) < own * attackRatio
    ) {
      best = other;
      bestDistance = otherDistance;
    }
  }
  return best;
};

const closestOnPath = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  point: { x: number; y: number },
): { x: number; y: number } => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  const t =
    length === 0
      ? 0
      : Math.min(
          Math.max(
            ((point.x - from.x) * dx + (point.y - from.y) * dy) / length,
            0,
          ),
          1,
        );
  return { x: from.x + dx * t, y: from.y + dy * t };
};

export const detour = (
  world: World,
  army: Army,
  x: number,
  y: number,
): { x: number; y: number } => {
  const { radius, threshold } = world.config.world.crosses;
  if (armyStrength(world, army) < threshold) {
    return { x, y };
  }
  const reach = radius + world.config.lobby.bots.crossMargin;
  const target = { x, y };
  for (const cross of world.crosses) {
    if (!isReady(world, cross)) {
      continue;
    }
    const closest = closestOnPath(army.mage, target, cross);
    const gap = Math.hypot(closest.x - cross.x, closest.y - cross.y);
    if (gap >= reach) {
      continue;
    }
    const dx = target.x - army.mage.x;
    const dy = target.y - army.mage.y;
    const length = Math.hypot(dx, dy) || 1;
    const side =
      gap > 0
        ? { x: (closest.x - cross.x) / gap, y: (closest.y - cross.y) / gap }
        : { x: -dy / length, y: dx / length };
    return {
      x: world.clampX(cross.x + side.x * reach),
      y: world.clampY(cross.y + side.y * reach),
    };
  }
  return target;
};

const moveTo = (world: World, army: Army, x: number, y: number): void => {
  const point = detour(world, army, x, y);
  orderMove(world, army, point.x, point.y);
};

const bestEvolution = (world: World, army: Army): string | undefined => {
  let best: { into: string; cost: number } | undefined;
  for (const [type, count] of evolvableCounts(world, army)) {
    for (const evolution of world.registries.units.get(type).evolutions) {
      if (evolution.cost <= count && evolution.cost > (best?.cost ?? 0)) {
        best = evolution;
      }
    }
  }
  return best?.into;
};

const think = (world: World, army: Army): void => {
  const { wanderDistance, huntRange, lootRange } = world.config.lobby.bots;
  const { mage } = army;
  if (army.retreat !== undefined) {
    return;
  }
  if (army.battle !== undefined) {
    flee(world, army, army.battle);
    return;
  }
  const evolution = bestEvolution(world, army);
  if (evolution !== undefined) {
    orderEvolve(world, army, evolution);
  }
  const prey = weakerArmy(world, army);
  if (prey !== undefined) {
    moveTo(world, army, prey.mage.x, prey.mage.y);
    return;
  }
  const point = nearestPoint(world, army, lootRange);
  if (point !== undefined) {
    moveTo(world, army, point.x, point.y);
    return;
  }
  const civilian = nearestCivilian(world, army, huntRange);
  if (civilian !== undefined) {
    moveTo(world, army, civilian.x, civilian.y);
    orderAttack(world, army, civilian.id);
    return;
  }
  if (mage.x === mage.targetX && mage.y === mage.targetY) {
    const { x, y } = world.randomNear(mage.x, mage.y, wanderDistance);
    moveTo(world, army, x, y);
  }
};

export const runBots = (world: World): void => {
  const { thinkIntervalSec } = world.config.lobby.bots;
  for (const army of world.armies.values()) {
    if (
      army.bot === undefined ||
      !army.alive ||
      world.time < army.bot.thinkAt
    ) {
      continue;
    }
    army.bot.thinkAt = world.time + thinkIntervalSec * (0.5 + world.random());
    think(world, army);
  }
};
