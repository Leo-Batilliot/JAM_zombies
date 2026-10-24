import { EntityKind } from "@horde/shared";
import { mainBodies } from "../systems/battle.js";
import { distance } from "../systems/bodies.js";
import { orderAttack, orderMove, orderRetreat } from "../systems/orders.js";
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
  const prey = weakerArmy(world, army);
  if (prey !== undefined) {
    orderMove(world, army, prey.mage.x, prey.mage.y);
    return;
  }
  const point = nearestPoint(world, army, lootRange);
  if (point !== undefined) {
    orderMove(world, army, point.x, point.y);
    return;
  }
  const civilian = nearestCivilian(world, army, huntRange);
  if (civilian !== undefined) {
    orderMove(world, army, civilian.x, civilian.y);
    orderAttack(world, army, civilian.id);
    return;
  }
  if (mage.x === mage.targetX && mage.y === mage.targetY) {
    const { x, y } = world.randomNear(mage.x, mage.y, wanderDistance);
    orderMove(world, army, x, y);
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
