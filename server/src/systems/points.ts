import type { Config } from "@horde/shared";
import type { Army, PointOfInterest, World } from "../world/world.js";
import { distance } from "./bodies.js";

type PointType = Config["world"]["pointsOfInterest"][string];

const lifetime = (world: World, type: PointType): number =>
  type.lifetimeSec.min +
  world.random() * (type.lifetimeSec.max - type.lifetimeSec.min);

export const spawnPoint = (
  world: World,
  typeId: string,
  x: number,
  y: number,
): PointOfInterest =>
  world.addPointOfInterest(
    typeId,
    x,
    y,
    lifetime(world, world.registries.pointsOfInterest.get(typeId)),
  );

export const createMassGrave = (
  world: World,
  x: number,
  y: number,
  corpses: string[],
): PointOfInterest | undefined => {
  if (corpses.length === 0) {
    return undefined;
  }
  const point = spawnPoint(world, world.config.world.massGrave, x, y);
  point.corpses = corpses;
  return point;
};

const rewards: Record<
  PointType["reward"],
  (world: World, point: PointOfInterest, army: Army) => void
> = {
  corpses: (world, point, army) => {
    const { raiseRadius } = world.config.gameplay.reanimation;
    for (const type of point.corpses) {
      const { x, y } = world.randomNear(army.mage.x, army.mage.y, raiseRadius);
      world.addUnit(army, type, x, y).raisedAt = world.time;
    }
    world.removeEntity(point);
  },
};

const nearestUnsearched = (
  world: World,
  army: Army,
): PointOfInterest | undefined => {
  let best: PointOfInterest | undefined;
  let bestDistance = Infinity;
  for (const point of world.points) {
    const { radius } = world.registries.pointsOfInterest.get(point.type);
    const pointDistance = distance(point, army.mage);
    if (
      pointDistance <= radius &&
      pointDistance < bestDistance &&
      !point.searchedBy.has(army)
    ) {
      best = point;
      bestDistance = pointDistance;
    }
  }
  return best;
};

export const searchPoints = (world: World, dt: number): void => {
  for (const army of world.armies.values()) {
    const point = army.alive ? nearestUnsearched(world, army) : undefined;
    if (point === undefined || army.mage.hitAt >= world.time - dt) {
      army.search = undefined;
      continue;
    }
    if (army.search?.pointId !== point.id) {
      army.search = { pointId: point.id, progress: 0 };
    }
    army.search.progress += dt;
    const type = world.registries.pointsOfInterest.get(point.type);
    if (army.search.progress >= type.searchSec) {
      army.search = undefined;
      point.searchedBy.add(army);
      rewards[type.reward](world, point, army);
    }
  }
};

export const maintainPoints = (world: World): void => {
  const counts = new Map<string, number>();
  for (const point of world.points) {
    if (world.time >= point.expiresAt) {
      world.removeEntity(point);
    } else {
      counts.set(point.type, (counts.get(point.type) ?? 0) + 1);
    }
  }
  for (const [typeId, type] of world.registries.pointsOfInterest.entries()) {
    for (let count = counts.get(typeId) ?? 0; count < type.count; count++) {
      const { x, y } = world.randomPoint();
      spawnPoint(world, typeId, x, y);
    }
  }
};
