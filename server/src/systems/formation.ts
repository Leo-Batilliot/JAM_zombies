import type { Config } from "@horde/shared";
import type { Army, Unit, World } from "../world/world.js";

export interface SlotOffset {
  forward: number;
  right: number;
}

type Layout = Config["formations"]["default"];

const blockOffsets = (
  count: number,
  spacing: number,
  start: number,
  direction: number,
): SlotOffset[] => {
  const columns = Math.ceil(Math.sqrt(count));
  const offsets: SlotOffset[] = [];
  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / columns);
    const inRow = Math.min(columns, count - row * columns);
    offsets.push({
      forward: direction * (start + row * spacing),
      right: ((index % columns) - (inRow - 1) / 2) * spacing,
    });
  }
  return offsets;
};

export const slotOffsets = (
  front: number,
  back: number,
  layout: Layout,
): SlotOffset[] => [
  ...blockOffsets(front, layout.spacing, layout.frontOffset, 1),
  ...blockOffsets(back, layout.spacing, layout.backOffset, -1),
];

export const formationSlots = (
  world: World,
  army: Army,
): Map<Unit, { x: number; y: number }> => {
  const front: Unit[] = [];
  const back: Unit[] = [];
  for (const unit of army.units) {
    const { rank } = world.registries.units.get(unit.type);
    (rank === "front" ? front : back).push(unit);
  }
  const offsets = slotOffsets(
    front.length,
    back.length,
    world.config.formations.default,
  );
  const { x, y, facingX, facingY } = army.mage;
  const slots = new Map<Unit, { x: number; y: number }>();
  [...front, ...back].forEach((unit, index) => {
    const offset = offsets[index] as SlotOffset;
    slots.set(unit, {
      x: x + facingX * offset.forward - facingY * offset.right,
      y: y + facingY * offset.forward + facingX * offset.right,
    });
  });
  return slots;
};

export const moveToward = (
  world: World,
  unit: Unit,
  x: number,
  y: number,
  step: number,
): void => {
  const dx = x - unit.x;
  const dy = y - unit.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= step) {
    world.setPosition(unit, x, y);
  } else {
    world.setPosition(
      unit,
      unit.x + (dx / distance) * step,
      unit.y + (dy / distance) * step,
    );
  }
};

export const followMages = (world: World, dt: number): void => {
  for (const army of world.armies.values()) {
    for (const [unit, slot] of formationSlots(world, army)) {
      const { speed } = world.registries.units.get(unit.type);
      moveToward(world, unit, slot.x, slot.y, speed * dt);
    }
  }
};
