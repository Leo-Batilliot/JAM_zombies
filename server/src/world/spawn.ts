import type { World } from "./world.js";

export const farPoint = (
  world: World,
  distanceFromDanger: (x: number, y: number) => number,
  wanted: number,
  tags?: string[],
): { x: number; y: number } => {
  let best = world.randomPoint(tags);
  let bestDistance = distanceFromDanger(best.x, best.y);
  for (
    let attempt = 1;
    attempt < world.config.world.spawnAttempts && bestDistance < wanted;
    attempt++
  ) {
    const point = world.randomPoint(tags);
    const distance = distanceFromDanger(point.x, point.y);
    if (distance > bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
};

export const distanceToMages = (world: World, x: number, y: number): number => {
  let nearest = Infinity;
  for (const { alive, mage } of world.armies.values()) {
    if (alive) {
      nearest = Math.min(nearest, Math.hypot(mage.x - x, mage.y - y));
    }
  }
  return nearest;
};
