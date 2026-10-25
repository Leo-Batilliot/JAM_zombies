import type { Army, SlotOffset, Unit, World } from "../world/world.js";
import { distance } from "./bodies.js";
import { reachDistance } from "./combat.js";
import { marchSpeed, powerPace, rallyBonus, unitSpeed } from "./pace.js";
import { effectsOf, type Formation } from "./tactics.js";
import { currentTarget, type Target } from "./targeting.js";

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

const slotPosition = (
  army: Army,
  offset: SlotOffset,
): { x: number; y: number } => {
  const { mage, heading } = army;
  return {
    x: mage.x + heading.x * offset.forward - heading.y * offset.right,
    y: mage.y + heading.y * offset.forward + heading.x * offset.right,
  };
};

const formationUnits = (army: Army): Unit[] =>
  [...army.units].filter((unit) => unit.group === undefined);

const isAssigned = (army: Army, units: Unit[]): boolean =>
  army.slotLayout === (army.formation ?? "") &&
  army.slots.size === units.length &&
  units.every((unit) => army.slots.has(unit));

const assign = (army: Army, units: Unit[], offsets: SlotOffset[]): void => {
  const free = new Set(units);
  for (const offset of offsets) {
    const position = slotPosition(army, offset);
    let best: Unit | undefined;
    let bestDistance = Infinity;
    for (const unit of free) {
      const gap = Math.hypot(unit.x - position.x, unit.y - position.y);
      if (gap < bestDistance) {
        best = unit;
        bestDistance = gap;
      }
    }
    if (best === undefined) {
      return;
    }
    free.delete(best);
    army.slots.set(best, offset);
  }
};

export const assignSlots = (world: World, army: Army): void => {
  const units = formationUnits(army);
  if (isAssigned(army, units)) {
    return;
  }
  const front: Unit[] = [];
  const back: Unit[] = [];
  for (const unit of units) {
    const { rank } = world.registries.units.get(unit.type);
    (rank === "front" ? front : back).push(unit);
  }
  const offsets = slotOffsets(
    front.length,
    back.length,
    effectsOf(world, army),
  );
  army.slots.clear();
  assign(army, front, offsets.slice(0, front.length));
  assign(army, back, offsets.slice(front.length));
  army.slotLayout = army.formation ?? "";
};

export const formationSlots = (
  world: World,
  army: Army,
): Map<Unit, { x: number; y: number }> => {
  assignSlots(world, army);
  const slots = new Map<Unit, { x: number; y: number }>();
  for (const [unit, offset] of army.slots) {
    slots.set(unit, slotPosition(army, offset));
  }
  return slots;
};

const moveToward = (
  world: World,
  unit: Unit,
  x: number,
  y: number,
  step: number,
): number => {
  const dx = x - unit.x;
  const dy = y - unit.y;
  const gap = Math.hypot(dx, dy);
  if (gap <= step) {
    world.setPosition(unit, x, y);
    return 0;
  }
  world.setPosition(
    unit,
    unit.x + (dx / gap) * step,
    unit.y + (dy / gap) * step,
  );
  return gap - step;
};

const chase = (world: World, unit: Unit, target: Target, step: number) => {
  const gap = distance(unit, target) - reachDistance(world, unit, target);
  if (gap > 0) {
    moveToward(world, unit, target.x, target.y, Math.min(step, gap));
  }
};

export const followMages = (world: World, dt: number): void => {
  const { arriveDistance, speedMultiplier } = world.config.gameplay.regroup;
  for (const army of world.armies.values()) {
    const slots = formationSlots(world, army);
    const march = marchSpeed(world, army) * dt;
    const pace = powerPace(world, army) * rallyBonus(world, army) * dt;
    for (const unit of army.units) {
      const target = currentTarget(world, unit);
      const slot = slots.get(unit);
      if (target !== undefined) {
        unit.returning = false;
        chase(world, unit, target, unitSpeed(world, unit) * pace);
      } else if (slot !== undefined) {
        const step = unit.returning
          ? unitSpeed(world, unit) * speedMultiplier * pace
          : march;
        if (moveToward(world, unit, slot.x, slot.y, step) <= arriveDistance) {
          unit.returning = false;
        }
      }
    }
  }
};
