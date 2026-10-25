import type { Army, Unit, World } from "../world/world.js";
import { distance } from "./bodies.js";
import { reachDistance } from "./combat.js";
import { armyPace } from "./enlist.js";
import { interceptPoint, tunnelSlots } from "./retreat.js";
import { layoutOf, type Formation } from "./tactics.js";
import { currentTarget, type Target } from "./targeting.js";

export interface SlotOffset {
  forward: number;
  right: number;
}

const goldenAngle = Math.PI * (3 - Math.sqrt(5));

const blockOffsets = (
  count: number,
  spacing: number,
  start: number,
  direction: number,
  width = 1,
): SlotOffset[] => {
  const columns = Math.ceil(Math.sqrt(count * width));
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

const wedgeOffsets = (
  count: number,
  spacing: number,
  start: number,
): SlotOffset[] => {
  let rows = 0;
  while (((rows + 1) * (rows + 2)) / 2 < count) {
    rows++;
  }
  const offsets: SlotOffset[] = [];
  for (let row = 0; offsets.length < count; row++) {
    for (let place = 0; place <= row && offsets.length < count; place++) {
      offsets.push({
        forward: start + (rows - row) * spacing,
        right: (place - row / 2) * spacing,
      });
    }
  }
  return offsets;
};

const ringOffsets = (
  count: number,
  spacing: number,
  inner: number,
): SlotOffset[] => {
  const offsets: SlotOffset[] = [];
  for (let ring = 0; offsets.length < count; ring++) {
    const radius = inner + ring * spacing;
    const capacity = Math.max(
      1,
      Math.min(
        Math.floor((2 * Math.PI * radius) / spacing),
        count - offsets.length,
      ),
    );
    for (let place = 0; place < capacity; place++) {
      const angle = (place / capacity) * 2 * Math.PI;
      offsets.push({
        forward: Math.cos(angle) * radius,
        right: Math.sin(angle) * radius,
      });
    }
  }
  return offsets;
};

const cloudOffsets = (
  count: number,
  spacing: number,
  inner: number,
): SlotOffset[] =>
  Array.from({ length: count }, (_, index) => {
    const radius = inner + spacing * Math.sqrt(index);
    const angle = index * goldenAngle;
    return {
      forward: Math.cos(angle) * radius,
      right: Math.sin(angle) * radius,
    };
  });

const insideOut = (
  front: number,
  back: number,
  place: (count: number) => SlotOffset[],
): SlotOffset[] => {
  const offsets = place(front + back);
  return [...offsets.slice(back), ...offsets.slice(0, back)];
};

export const slotOffsets = (
  front: number,
  back: number,
  formation: Formation,
): SlotOffset[] => {
  const { spacing, frontOffset, backOffset, width } = formation;
  switch (formation.layout) {
    case "block":
      return [
        ...blockOffsets(front, spacing, frontOffset, 1, width),
        ...blockOffsets(back, spacing, backOffset, -1, width),
      ];
    case "wedge":
      return [
        ...wedgeOffsets(front, spacing, frontOffset),
        ...blockOffsets(back, spacing, backOffset, -1),
      ];
    case "ring":
      return insideOut(front, back, (count) =>
        ringOffsets(count, spacing, frontOffset),
      );
    case "cloud":
      return insideOut(front, back, (count) =>
        cloudOffsets(count, spacing, frontOffset),
      );
  }
};

export const formationSlots = (
  world: World,
  army: Army,
  units: Iterable<Unit> = army.units,
): Map<Unit, { x: number; y: number }> => {
  const front: Unit[] = [];
  const back: Unit[] = [];
  for (const unit of units) {
    const { rank } = world.registries.units.get(unit.type);
    (rank === "front" ? front : back).push(unit);
  }
  const offsets = slotOffsets(front.length, back.length, layoutOf(world, army));
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

const moveToward = (
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

const chase = (world: World, unit: Unit, target: Target, step: number) => {
  const gap = distance(unit, target) - reachDistance(world, unit, target);
  if (gap > 0) {
    moveToward(world, unit, target.x, target.y, Math.min(step, gap));
  }
};

const regroupStep = (
  world: World,
  unit: Unit,
  slot: { x: number; y: number },
  step: number,
): number => {
  const {
    distance: far,
    arriveDistance,
    speedMultiplier,
  } = world.config.gameplay.regroup;
  const gap = Math.hypot(slot.x - unit.x, slot.y - unit.y);
  if (gap > far) {
    unit.returning = true;
  } else if (gap <= arriveDistance) {
    unit.returning = false;
  }
  return unit.returning ? step * speedMultiplier : step;
};

export const followMages = (world: World, dt: number): void => {
  for (const army of world.armies.values()) {
    const tunnel = tunnelSlots(world, army);
    const formation = formationSlots(
      world,
      army,
      [...army.units].filter(
        (unit) => unit.group === undefined && !tunnel.has(unit),
      ),
    );
    const pace = armyPace(world, army) * dt;
    for (const unit of army.units) {
      const step = world.registries.units.get(unit.type).speed * pace;
      const target = currentTarget(world, unit);
      const wall = tunnel.get(unit);
      const slot = formation.get(unit);
      if (wall !== undefined) {
        const goal = interceptPoint(world, unit, wall);
        moveToward(
          world,
          unit,
          goal.x,
          goal.y,
          regroupStep(world, unit, goal, step),
        );
      } else if (target !== undefined) {
        unit.returning = false;
        chase(world, unit, target, step);
      } else if (slot !== undefined) {
        moveToward(
          world,
          unit,
          slot.x,
          slot.y,
          regroupStep(world, unit, slot, step),
        );
      }
    }
  }
};
