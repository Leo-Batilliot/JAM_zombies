import { isBody, type Projectile, type World } from "../world/world.js";
import { bodyRadius } from "./bodies.js";
import { isReady } from "./crosses.js";
import { damage } from "./death.js";

const burns = (world: World, projectile: Projectile): boolean => {
  const { radius } = world.config.world.crosses;
  for (const cross of world.crosses) {
    if (
      isReady(world, cross) &&
      Math.hypot(projectile.x - cross.x, projectile.y - cross.y) <= radius &&
      Math.hypot(projectile.fromX - cross.x, projectile.fromY - cross.y) >
        radius
    ) {
      return true;
    }
  }
  return false;
};

export const moveProjectiles = (world: World, dt: number): void => {
  for (const projectile of world.projectiles) {
    const target = world.entities.get(projectile.targetId);
    if (
      target === undefined ||
      !isBody(target) ||
      !world.registries.projectiles.has(projectile.type)
    ) {
      world.removeEntity(projectile);
      continue;
    }
    const step = world.registries.projectiles.get(projectile.type).speed * dt;
    const dx = target.x - projectile.x;
    const dy = target.y - projectile.y;
    const gap = Math.hypot(dx, dy);
    if (gap <= step + bodyRadius(world, target)) {
      world.removeEntity(projectile);
      damage(
        world,
        target,
        projectile.damage,
        projectile.attacker,
        projectile.attackerName,
      );
      continue;
    }
    world.setPosition(
      projectile,
      projectile.x + (dx / gap) * step,
      projectile.y + (dy / gap) * step,
    );
    if (burns(world, projectile)) {
      world.removeEntity(projectile);
    }
  }
};
