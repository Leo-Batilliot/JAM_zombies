import { EntityKind } from "@horde/shared";
import type { Entity, Mage, Npc, Unit, World } from "../world/world.js";
import { bodyRadius, distance } from "./bodies.js";
import { damage } from "./death.js";
import { nearestPrey } from "./targeting.js";

type Prey = Mage | Unit;

const asPrey = (entity: Entity | undefined): Prey | undefined =>
  entity?.kind === EntityKind.Mage || entity?.kind === EntityKind.Unit
    ? entity
    : undefined;

const fromHome = (npc: Npc, prey: Prey): number =>
  Math.hypot(prey.x - npc.homeX, prey.y - npc.homeY);

const preyInRange = (
  world: World,
  npc: Npc,
  range: number,
  leash: number,
  near: number[],
): Prey | undefined => {
  near.length = 0;
  world.grid.queryRadius(npc.x, npc.y, range, near);
  return nearestPrey(npc, near, (id) => {
    const prey = asPrey(world.entities.get(id));
    return prey !== undefined && fromHome(npc, prey) <= leash
      ? prey
      : undefined;
  });
};

const moveToward = (
  world: World,
  npc: Npc,
  x: number,
  y: number,
  length: number,
): void => {
  const dx = x - npc.x;
  const dy = y - npc.y;
  const gap = Math.hypot(dx, dy);
  if (gap <= length) {
    world.setPosition(npc, x, y);
    return;
  }
  world.setPosition(
    npc,
    npc.x + (dx / gap) * length,
    npc.y + (dy / gap) * length,
  );
};

export const updateHostiles = (world: World, dt: number): void => {
  const { retargetIntervalSec } = world.config.gameplay.combat;
  const near: number[] = [];
  for (const npc of world.hostiles) {
    const stats = world.registries.npcs.get(npc.type);
    const { attack } = stats;
    if (attack === undefined) {
      continue;
    }
    npc.cooldown = Math.max(0, npc.cooldown - dt);
    let target =
      npc.targetId === undefined
        ? undefined
        : asPrey(world.entities.get(npc.targetId));
    if (
      target === undefined ||
      fromHome(npc, target) > attack.leashDistance ||
      distance(target, npc) > attack.aggroRange
    ) {
      target = undefined;
    }
    if (world.time >= npc.retargetAt) {
      npc.retargetAt =
        world.time + retargetIntervalSec * (0.5 + world.random());
      target = preyInRange(
        world,
        npc,
        attack.aggroRange,
        attack.leashDistance,
        near,
      );
    }
    npc.targetId = target?.id;
    if (target === undefined) {
      npc.fighting = false;
      moveToward(world, npc, npc.homeX, npc.homeY, stats.speed * dt);
      continue;
    }
    const reach =
      attack.attackRange + bodyRadius(world, npc) + bodyRadius(world, target);
    npc.fighting = distance(npc, target) <= reach;
    if (!npc.fighting) {
      moveToward(world, npc, target.x, target.y, stats.speed * dt);
    } else if (npc.cooldown <= 0) {
      npc.cooldown = attack.attackIntervalSec;
      damage(world, target, attack.damage, undefined, stats.name);
    }
  }
};
