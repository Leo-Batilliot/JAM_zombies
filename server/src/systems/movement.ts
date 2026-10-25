import type { Army, Mage, World } from "../world/world.js";
import { aggroCircles, clampToCircles } from "./battle.js";
import { armyPace } from "./enlist.js";

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

const endRetreat = (world: World, army: Army): void => {
  const { retreat, mage } = army;
  if (
    retreat !== undefined &&
    Math.hypot(retreat.exitX - mage.x, retreat.exitY - mage.y) <=
      world.config.gameplay.retreat.arriveDistance
  ) {
    army.retreat = undefined;
  }
};

export const moveMages = (world: World, dt: number): void => {
  for (const army of world.armies.values()) {
    const { alive, mage } = army;
    if (!alive) {
      continue;
    }
    const step = world.config.gameplay.mage.speed * dt * armyPace(world, army);
    endRetreat(world, army);
    const dx = mage.targetX - mage.x;
    const dy = mage.targetY - mage.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) {
      continue;
    }
    const next =
      distance <= step
        ? { x: mage.targetX, y: mage.targetY }
        : {
            x: mage.x + (dx / distance) * step,
            y: mage.y + (dy / distance) * step,
          };
    const { x, y } =
      army.battle !== undefined && army.retreat === undefined
        ? clampToCircles(aggroCircles(world, army), mage, next)
        : next;
    world.setPosition(mage, x, y);
  }
};
