import type { Mage, World } from "../world/world.js";

export const setMageTarget = (
  world: World,
  mage: Mage,
  x: number,
  y: number,
): void => {
  mage.targetX = world.clampX(x);
  mage.targetY = world.clampY(y);
  const dx = mage.targetX - mage.x;
  const dy = mage.targetY - mage.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 0) {
    mage.facingX = dx / distance;
    mage.facingY = dy / distance;
  }
};

export const moveMages = (world: World, dt: number): void => {
  const step = world.config.gameplay.mage.speed * dt;
  for (const { mage } of world.armies.values()) {
    const dx = mage.targetX - mage.x;
    const dy = mage.targetY - mage.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) {
      continue;
    }
    if (distance <= step) {
      world.setPosition(mage, mage.targetX, mage.targetY);
    } else {
      world.setPosition(
        mage,
        mage.x + (dx / distance) * step,
        mage.y + (dy / distance) * step,
      );
    }
  }
};
