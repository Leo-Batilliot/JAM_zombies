import { EntityKind } from "@horde/shared";
import type { Army, Body, Entity, Unit, World } from "../world/world.js";
import { enclose, isHostile } from "./battle.js";
import { bodyRadius } from "./bodies.js";
import { setMageTarget } from "./movement.js";
import { receiver, transferCorpse } from "./transfer.js";

export interface TunnelSlot {
  x: number;
  y: number;
  wing: boolean;
  side: number;
}

const abandon = (world: World, army: Army): void => {
  const contact = [...army.units].filter(
    (unit) => unit.fighting && unit.group === undefined,
  );
  if (contact.length === 0) {
    return;
  }
  const { x, y } = enclose(army, contact);
  const group = {
    army,
    units: new Set(contact),
    corpses: new Set<never>(),
    anchorX: x,
    anchorY: y,
    engagedAt: world.time,
  };
  for (const unit of contact) {
    unit.group = group;
    unit.returning = false;
  }
  army.groups.add(group);
};

const handOverCorpses = (world: World, army: Army, foes: Set<Army>): void => {
  for (const corpse of [...army.corpses]) {
    if (
      corpse.group === undefined &&
      corpse.killer !== undefined &&
      foes.has(corpse.killer)
    ) {
      const to = receiver(world, corpse.killer, army);
      if (to !== undefined) {
        transferCorpse(corpse, to);
      }
    }
  }
};

export const orderRetreat = (
  world: World,
  army: Army,
  x: number,
  y: number,
): boolean => {
  const { battle, mage } = army;
  if (!army.alive || battle === undefined || battle.encircled) {
    return false;
  }
  const exitX = world.clampX(x);
  const exitY = world.clampY(y);
  let dirX = exitX - mage.x;
  let dirY = exitY - mage.y;
  const length = Math.hypot(dirX, dirY);
  if (length === 0) {
    dirX = Math.cos(battle.escapeAngle);
    dirY = Math.sin(battle.escapeAngle);
  } else {
    dirX /= length;
    dirY /= length;
  }

  abandon(world, army);
  const foes = new Set<Army>();
  for (const foe of battle.foes) {
    if (foe.army !== undefined) {
      foes.add(foe.army);
    }
  }
  handOverCorpses(world, army, foes);

  const { baseOffset, minTunnelUnits } = world.config.gameplay.retreat;
  const originX = mage.x - dirX * baseOffset;
  const originY = mage.y - dirY * baseOffset;
  const local = (unit: Unit) => ({
    unit,
    forward: (unit.x - originX) * dirX + (unit.y - originY) * dirY,
    side: (unit.x - originX) * -dirY + (unit.y - originY) * dirX,
  });
  const units = [...army.units]
    .filter((unit) => unit.group === undefined)
    .map(local)
    .sort((a, b) => a.side - b.side);
  const half = Math.floor(units.length / 2);
  const wall = (part: typeof units) =>
    part.sort((a, b) => a.forward - b.forward).map((entry) => entry.unit);

  army.retreat = {
    exitX,
    exitY,
    originX,
    originY,
    dirX,
    dirY,
    left: wall(units.slice(0, half)),
    right: wall(units.slice(half)),
    escort:
      units.length < minTunnelUnits
        ? units.map((entry) => entry.unit)
        : undefined,
    released: 0,
  };
  army.focusId = undefined;
  setMageTarget(world, mage, exitX, exitY);
  return true;
};

export const tunnelSlots = (
  world: World,
  army: Army,
): Map<Unit, TunnelSlot> => {
  const slots = new Map<Unit, TunnelSlot>();
  const { retreat, mage } = army;
  if (retreat === undefined) {
    return slots;
  }
  const {
    minTunnelUnits,
    corridorWidth,
    spacing,
    wingRows,
    wingFlare,
    foldMargin,
    escortRadius,
  } = world.config.gameplay.retreat;
  const keep = (unit: Unit): boolean =>
    unit.army === army &&
    unit.group === undefined &&
    world.entities.get(unit.id) === unit;
  retreat.left = retreat.left.filter(keep);
  retreat.right = retreat.right.filter(keep);

  if (retreat.escort === undefined) {
    const progress =
      (mage.x - retreat.originX) * retreat.dirX +
      (mage.y - retreat.originY) * retreat.dirY;
    while (
      (retreat.left.length > 0 || retreat.right.length > 0) &&
      retreat.released * spacing + foldMargin < progress
    ) {
      retreat.left.shift();
      retreat.right.shift();
      retreat.released++;
    }
    const remaining = retreat.left.length + retreat.right.length;
    if (remaining > 0 && remaining < minTunnelUnits) {
      retreat.escort = [...retreat.left, ...retreat.right];
      retreat.left = [];
      retreat.right = [];
    }
  }

  if (retreat.escort !== undefined) {
    retreat.escort = retreat.escort.filter(keep);
    retreat.escort.forEach((unit, index, escort) => {
      const angle = (index / escort.length) * 2 * Math.PI;
      slots.set(unit, {
        x: world.clampX(mage.x + Math.cos(angle) * escortRadius),
        y: world.clampY(mage.y + Math.sin(angle) * escortRadius),
        wing: false,
        side: 0,
      });
    });
    return slots;
  }

  const place = (wall: Unit[], side: number): void => {
    wall.forEach((unit, index) => {
      const row = retreat.released + index;
      const lateral =
        side * (corridorWidth / 2 + Math.max(0, wingRows - row) * wingFlare);
      const forward = row * spacing;
      slots.set(unit, {
        x: world.clampX(
          retreat.originX + retreat.dirX * forward - retreat.dirY * lateral,
        ),
        y: world.clampY(
          retreat.originY + retreat.dirY * forward + retreat.dirX * lateral,
        ),
        wing: row < wingRows,
        side,
      });
    });
  };
  place(retreat.left, -1);
  place(retreat.right, 1);
  return slots;
};

const isFoe = (
  world: World,
  army: Army,
  entity: Entity | undefined,
): entity is Body =>
  ((entity?.kind === EntityKind.Unit || entity?.kind === EntityKind.Mage) &&
    entity.army !== army) ||
  (entity?.kind === EntityKind.Npc && isHostile(world, entity));

export const interceptPoint = (
  world: World,
  unit: Unit,
  slot: TunnelSlot,
): { x: number; y: number } => {
  const { retreat, mage } = unit.army;
  if (!slot.wing || retreat === undefined) {
    return slot;
  }
  const { corridorWidth, wingReach } = world.config.gameplay.retreat;
  let enemy: Body | undefined;
  let enemyDistance = Infinity;
  for (const id of world.grid.queryRadius(slot.x, slot.y, wingReach)) {
    const entity = world.entities.get(id);
    if (!isFoe(world, unit.army, entity)) {
      continue;
    }
    const lateral =
      (entity.x - retreat.originX) * -retreat.dirY +
      (entity.y - retreat.originY) * retreat.dirX;
    const gap = Math.hypot(entity.x - slot.x, entity.y - slot.y);
    if (lateral * slot.side > corridorWidth / 2 && gap < enemyDistance) {
      enemy = entity;
      enemyDistance = gap;
    }
  }
  if (enemy === undefined) {
    return slot;
  }
  const towardX = mage.x - enemy.x;
  const towardY = mage.y - enemy.y;
  const length = Math.hypot(towardX, towardY) || 1;
  const reach = bodyRadius(world, enemy) + bodyRadius(world, unit);
  const offsetX = enemy.x + (towardX / length) * reach - slot.x;
  const offsetY = enemy.y + (towardY / length) * reach - slot.y;
  const offset = Math.hypot(offsetX, offsetY);
  const scale = offset > wingReach ? wingReach / offset : 1;
  return { x: slot.x + offsetX * scale, y: slot.y + offsetY * scale };
};
