import { EntityKind } from "@horde/shared";
import type { Mist, World } from "../world/world.js";
import { bodyLayer } from "./bodies.js";
import { damage } from "./death.js";

const lifetime = (world: World, type: string): number => {
  const { min, max } = world.registries.mists.get(type).lifetimeSec;
  return min + world.random() * (max - min);
};

export const maintainMists = (world: World): void => {
  const counts = new Map<string, number>();
  for (const mist of world.mists) {
    if (
      world.time >= mist.expiresAt ||
      !world.registries.mists.has(mist.type)
    ) {
      world.removeEntity(mist);
    } else {
      counts.set(mist.type, (counts.get(mist.type) ?? 0) + 1);
    }
  }
  for (const [type, { count }] of world.registries.mists.entries()) {
    for (let index = counts.get(type) ?? 0; index < count; index++) {
      const { x, y } = world.randomPoint();
      world.addMist(type, x, y, lifetime(world, type));
    }
  }
};

const drift = (world: World, mist: Mist, dt: number): void => {
  const { speed, turnIntervalSec } = world.registries.mists.get(mist.type);
  if (world.time >= mist.turnAt) {
    const angle = world.random() * 2 * Math.PI;
    mist.dirX = Math.cos(angle);
    mist.dirY = Math.sin(angle);
    mist.turnAt = world.time + turnIntervalSec;
  }
  const x = mist.x + mist.dirX * speed * dt;
  const y = mist.y + mist.dirY * speed * dt;
  if (x < 0 || x > world.config.world.width) {
    mist.dirX = -mist.dirX;
  }
  if (y < 0 || y > world.config.world.height) {
    mist.dirY = -mist.dirY;
  }
  world.setPosition(mist, x, y);
};

const harm = (world: World, mist: Mist, dt: number): void => {
  const { radius, damagePerSec, name, groundOnly } = world.registries.mists.get(
    mist.type,
  );
  if (damagePerSec <= 0) {
    return;
  }
  for (const id of world.grid.queryRadius(mist.x, mist.y, radius)) {
    const body = world.entities.get(id);
    if (
      (body?.kind === EntityKind.Unit || body?.kind === EntityKind.Mage) &&
      (groundOnly !== true || bodyLayer(world, body) === "ground")
    ) {
      damage(world, body, damagePerSec * dt, undefined, name);
    }
  }
};

export const updateMists = (world: World, dt: number): void => {
  for (const mist of world.mists) {
    drift(world, mist, dt);
    harm(world, mist, dt);
  }
};

export const mistDelay = (
  world: World,
  x: number,
  y: number,
): number | undefined => {
  let delay: number | undefined;
  for (const mist of world.mists) {
    const { radius, reanimationDelaySec } = world.registries.mists.get(
      mist.type,
    );
    if (
      reanimationDelaySec !== undefined &&
      Math.hypot(mist.x - x, mist.y - y) <= radius
    ) {
      delay = Math.min(delay ?? Infinity, reanimationDelaySec);
    }
  }
  return delay;
};
