import type { Army, Direction, Mage, World } from "../world/world.js";
import { marchSpeed } from "./pace.js";

const degrees = Math.PI / 180;

const angleOf = (direction: Direction): number =>
  Math.atan2(direction.y, direction.x);

const angleBetween = (from: number, to: number): number =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));

const aimFormation = (world: World, army: Army, dx: number, dy: number) => {
  const { distance, angleDeg } = world.config.formations.turn;
  const length = Math.hypot(dx, dy);
  if (length === 0 || length < distance) {
    return;
  }
  const turn = angleBetween(angleOf(army.heading), Math.atan2(dy, dx));
  if (Math.abs(turn) >= angleDeg * degrees) {
    army.headingTarget = { x: dx / length, y: dy / length };
  }
};

export const setMageTarget = (
  world: World,
  mage: Mage,
  x: number,
  y: number,
): void => {
  const free = world.freePoint(x, y, world.config.world.city.clearance);
  mage.targetX = free.x;
  mage.targetY = free.y;
  aimFormation(world, mage.army, mage.targetX - mage.x, mage.targetY - mage.y);
};

const turnFormation = (world: World, army: Army, dt: number): void => {
  const current = angleOf(army.heading);
  const turn = angleBetween(current, angleOf(army.headingTarget));
  if (turn === 0) {
    return;
  }
  const step = world.config.formations.turn.degPerSec * degrees * dt;
  const angle = current + Math.sign(turn) * Math.min(Math.abs(turn), step);
  army.heading = { x: Math.cos(angle), y: Math.sin(angle) };
};

export const moveMages = (world: World, dt: number): void => {
  for (const army of world.armies.values()) {
    const { alive, mage } = army;
    if (!alive) {
      continue;
    }
    turnFormation(world, army, dt);
    const step = marchSpeed(world, army) * dt;
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
