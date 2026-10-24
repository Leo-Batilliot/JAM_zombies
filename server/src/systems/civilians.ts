import { EntityKind, type Config } from "@horde/shared";
import { distanceToMages, farPoint } from "../world/spawn.js";
import type { Entity, Npc, NpcGroup, World } from "../world/world.js";

type Population = Config["world"]["populations"][number];

const isThreat = (entity: Entity | undefined): entity is Entity =>
  entity?.kind === EntityKind.Mage || entity?.kind === EntityKind.Unit;

const nearestThreat = (
  world: World,
  npc: Npc,
  radius: number,
  near: number[],
): Entity | undefined => {
  near.length = 0;
  world.grid.queryRadius(npc.x, npc.y, radius, near);
  let best: Entity | undefined;
  let bestDistance = Infinity;
  for (const id of near) {
    const entity = world.entities.get(id);
    if (!isThreat(entity)) {
      continue;
    }
    const threatDistance = Math.hypot(entity.x - npc.x, entity.y - npc.y);
    if (threatDistance < bestDistance) {
      best = entity;
      bestDistance = threatDistance;
    }
  }
  return best;
};

const step = (
  world: World,
  entity: { x: number; y: number },
  x: number,
  y: number,
  length: number,
): { x: number; y: number } => {
  const dx = x - entity.x;
  const dy = y - entity.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= length) {
    return { x: world.clampX(x), y: world.clampY(y) };
  }
  return {
    x: world.clampX(entity.x + (dx / distance) * length),
    y: world.clampY(entity.y + (dy / distance) * length),
  };
};

const moveGroup = (
  world: World,
  group: NpcGroup,
  population: Population,
  dt: number,
  near: number[],
): void => {
  const { speed, fleeSpeed } = world.registries.npcs.get(population.npc);
  let awayX = 0;
  let awayY = 0;
  for (const npc of group.members) {
    const threat = nearestThreat(world, npc, population.fleeRadius, near);
    if (threat === undefined) {
      const goal = step(
        world,
        npc,
        group.x + npc.offsetX,
        group.y + npc.offsetY,
        speed * dt,
      );
      world.setPosition(npc, goal.x, goal.y);
      continue;
    }
    const dx = npc.x - threat.x;
    const dy = npc.y - threat.y;
    const length = Math.hypot(dx, dy) || 1;
    awayX += dx / length;
    awayY += dy / length;
    world.setPosition(
      npc,
      npc.x + (dx / length) * fleeSpeed * dt,
      npc.y + (dy / length) * fleeSpeed * dt,
    );
  }
  const fleeing = awayX !== 0 || awayY !== 0;
  if (fleeing) {
    const length = Math.hypot(awayX, awayY);
    group.targetX = world.clampX(
      group.x + (awayX / length) * population.wanderDistance,
    );
    group.targetY = world.clampY(
      group.y + (awayY / length) * population.wanderDistance,
    );
    group.wanderAt = world.time + population.wanderIntervalSec;
  } else if (world.time >= group.wanderAt) {
    const target = world.randomNear(
      group.x,
      group.y,
      population.wanderDistance,
    );
    group.targetX = target.x;
    group.targetY = target.y;
    group.wanderAt = world.time + population.wanderIntervalSec;
  }
  const anchor = step(
    world,
    group,
    group.targetX,
    group.targetY,
    (fleeing ? fleeSpeed : speed) * dt,
  );
  group.x = anchor.x;
  group.y = anchor.y;
};

export const moveCivilians = (world: World, dt: number): void => {
  const near: number[] = [];
  for (const group of world.npcGroups) {
    const population = world.config.world.populations[group.population];
    if (population !== undefined) {
      moveGroup(world, group, population, dt, near);
    }
  }
};

const spawnGroup = (
  world: World,
  index: number,
  population: Population,
  size: number,
): NpcGroup => {
  const { x, y } = farPoint(
    world,
    (px, py) => distanceToMages(world, px, py),
    population.safeDistance,
  );
  const group = world.addNpcGroup(index, x, y);
  for (let member = 0; member < size; member++) {
    const offset = world.randomNear(0, 0, population.groupSpread);
    world.addNpc(group, population.npc, offset.x, offset.y);
  }
  return group;
};

const populationCount = (world: World, index: number): number => {
  let count = 0;
  for (const group of world.npcGroups) {
    if (group.population === index) {
      count += group.members.size;
    }
  }
  return count;
};

const groupSize = (world: World, population: Population, missing: number) => {
  const { min, max } = population.groupSize;
  const size = min + Math.floor(world.random() * (max - min + 1));
  return Math.max(1, Math.min(size, missing));
};

export const maintainPopulations = (world: World): void => {
  world.config.world.populations.forEach((population, index) => {
    const spawnAt = world.populationSpawnAt.get(index);
    let missing = population.count - populationCount(world, index);
    if ((spawnAt !== undefined && world.time < spawnAt) || missing <= 0) {
      return;
    }
    do {
      const size = groupSize(world, population, missing);
      spawnGroup(world, index, population, size);
      missing -= size;
    } while (spawnAt === undefined && missing > 0);
    world.populationSpawnAt.set(
      index,
      world.time + population.respawnIntervalSec,
    );
  });
};
