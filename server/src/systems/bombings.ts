import { EntityKind } from "@horde/shared";
import type { Army, Bombing, World } from "../world/world.js";
import { damage } from "./death.js";
import { drawWeighted } from "./equipment.js";
import { armyStrength } from "./strength.js";

const zoneCenter = (world: World): { x: number; y: number } => {
  const targets: [Army, number][] = [];
  for (const army of world.armies.values()) {
    const strength = army.alive ? armyStrength(world, army) : 0;
    if (strength > 0) {
      targets.push([army, strength]);
    }
  }
  const [target] =
    drawWeighted(world, targets, ([, strength]) => strength) ?? [];
  if (target === undefined) {
    return world.randomPoint();
  }
  return world.randomNear(
    target.mage.x,
    target.mage.y,
    world.config.world.bombings.spread,
  );
};

export const markZones = (world: World): void => {
  const { zones, delaySec } = world.config.world.bombings;
  for (let index = 0; index < zones; index++) {
    const { x, y } = zoneCenter(world);
    world.addBombing(x, y, delaySec);
  }
};

export const crowdMultiplier = (world: World, count: number): number => {
  const { crowding, maxMultiplier } = world.config.world.bombings;
  return Math.min(1 + crowding * Math.max(count - 1, 0), maxMultiplier);
};

const strike = (world: World, bombing: Bombing): void => {
  const { radius, damage: base, name } = world.config.world.bombings;
  bombing.struck = true;
  const ids = world.grid.queryRadius(bombing.x, bombing.y, radius);
  const counts = new Map<Army, number>();
  for (const id of ids) {
    const body = world.entities.get(id);
    if (body?.kind === EntityKind.Unit || body?.kind === EntityKind.Mage) {
      counts.set(body.army, (counts.get(body.army) ?? 0) + 1);
    }
  }
  for (const id of ids) {
    const body = world.entities.get(id);
    if (body?.kind === EntityKind.Unit || body?.kind === EntityKind.Mage) {
      const amount = base * crowdMultiplier(world, counts.get(body.army) ?? 1);
      damage(world, body, amount, undefined, name);
    }
  }
};

export const runBombings = (world: World): void => {
  const { blastSec, intervalSec } = world.config.world.bombings;
  for (const bombing of world.bombings) {
    if (!bombing.struck && world.time >= bombing.strikeAt) {
      strike(world, bombing);
    } else if (bombing.struck && world.time >= bombing.strikeAt + blastSec) {
      world.removeEntity(bombing);
    }
  }
  if (world.time >= world.bombingAt) {
    markZones(world);
    world.bombingAt =
      world.time +
      intervalSec.min +
      world.random() * (intervalSec.max - intervalSec.min);
  }
};

export const bombingProgress = (world: World, bombing: Bombing): number => {
  const { delaySec } = world.config.world.bombings;
  if (bombing.struck) {
    return 1;
  }
  return delaySec > 0
    ? Math.min(Math.max(1 - (bombing.strikeAt - world.time) / delaySec, 0), 1)
    : 1;
};
