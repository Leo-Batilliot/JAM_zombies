import type { Mage, World } from "../world/world.js";

export const setMageTarget = (
  world: World,
  mage: Mage,
  x: number,
  y: number,
): void => {
  mage.targetX = world.clampX(x);
  mage.targetY = world.clampY(y);
};

export const moveMages = (world: World, dt: number): void => {
  const step = world.config.gameplay.mage.speed * dt;
  for (const entity of world.entities.values()) {
    const dx = entity.targetX - entity.x;
    const dy = entity.targetY - entity.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) {
      continue;
    }
    if (distance <= step) {
      world.setPosition(entity, entity.targetX, entity.targetY);
    } else {
      world.setPosition(
        entity,
        entity.x + (dx / distance) * step,
        entity.y + (dy / distance) * step,
      );
    }
  }
};
