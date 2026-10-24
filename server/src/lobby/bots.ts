import { EntityKind } from "@horde/shared";
import { distance } from "../systems/bodies.js";
import { orderAttack, orderMove } from "../systems/orders.js";
import type { Army, Entity, PointOfInterest, World } from "../world/world.js";

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

const think = (world: World, army: Army): void => {
  const { wanderDistance, huntRange, lootRange } = world.config.lobby.bots;
  const { mage } = army;
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
