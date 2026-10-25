import { EntityKind } from "@horde/shared";
import { farPoint } from "../world/spawn.js";
import type { Army, Cross, Unit, World } from "../world/world.js";
import { kill } from "./death.js";

const distanceToCrosses = (world: World, x: number, y: number): number => {
  let nearest = Infinity;
  for (const cross of world.crosses) {
    nearest = Math.min(nearest, Math.hypot(cross.x - x, cross.y - y));
  }
  return nearest;
};

const spawnCross = (world: World): Cross => {
  const { spacing, lifetimeSec } = world.config.world.crosses;
  const { x, y } = farPoint(
    world,
    (px, py) => distanceToCrosses(world, px, py),
    spacing,
  );
  return world.addCross(
    x,
    y,
    lifetimeSec.min + world.random() * (lifetimeSec.max - lifetimeSec.min),
  );
};

export const isReady = (world: World, cross: Cross): boolean =>
  world.time >= cross.readyAt;

export const maintainCrosses = (world: World): void => {
  for (const cross of world.crosses) {
    if (world.time >= cross.expiresAt && isReady(world, cross)) {
      world.removeEntity(cross);
    }
  }
  while (world.crosses.size < world.config.world.crosses.count) {
    spawnCross(world);
  }
};

const unitsInside = (world: World, cross: Cross): Unit[] => {
  const units: Unit[] = [];
  for (const id of world.grid.queryRadius(
    cross.x,
    cross.y,
    world.config.world.crosses.radius,
  )) {
    const entity = world.entities.get(id);
    if (entity?.kind === EntityKind.Unit) {
      units.push(entity);
    }
  }
  return units;
};

const activate = (world: World, cross: Cross, units: Unit[]): void => {
  const { threshold, rechargeSec } = world.config.world.crosses;
  const struck = new Set<Army>();
  for (const [army, strength] of cross.strengths) {
    if (strength >= threshold) {
      struck.add(army);
    }
  }
  if (struck.size === 0) {
    return;
  }
  for (const unit of units) {
    if (struck.has(unit.army)) {
      kill(world, unit, undefined, true);
    }
  }
  cross.readyAt = world.time + rechargeSec;
};

export const updateCrosses = (world: World): void => {
  for (const cross of world.crosses) {
    const units = unitsInside(world, cross);
    cross.strengths.clear();
    for (const unit of units) {
      const { strength } = world.registries.units.get(unit.type);
      cross.strengths.set(
        unit.army,
        (cross.strengths.get(unit.army) ?? 0) + strength,
      );
    }
    if (isReady(world, cross)) {
      activate(world, cross, units);
    }
  }
};
