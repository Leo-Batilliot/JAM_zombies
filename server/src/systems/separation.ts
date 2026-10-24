import { EntityKind } from "@horde/shared";
import type { Entity, World } from "../world/world.js";

const goldenAngle = Math.PI * (3 - Math.sqrt(5));

export const bodyRadius = (world: World, entity: Entity): number =>
  entity.kind === EntityKind.Mage
    ? world.config.gameplay.mage.radius
    : world.registries.units.get(entity.type).radius;

const largestRadius = (world: World): number =>
  Math.max(
    world.config.gameplay.mage.radius,
    ...world.registries.units.entries().map(([, unit]) => unit.radius),
  );

const push = (world: World, entity: Entity, dx: number, dy: number): void => {
  world.setPosition(entity, entity.x + dx, entity.y + dy);
};

export const separateBodies = (world: World): void => {
  const strength = world.config.gameplay.movement.separation;
  const reach = largestRadius(world);
  const near: number[] = [];
  for (const entity of world.entities.values()) {
    if (entity.kind === EntityKind.Mage) {
      continue;
    }
    const radius = bodyRadius(world, entity);
    near.length = 0;
    world.grid.queryRadius(entity.x, entity.y, radius + reach, near);
    for (const otherId of near) {
      const other = world.entities.get(otherId);
      if (other === undefined || other === entity) {
        continue;
      }
      const minDistance = radius + bodyRadius(world, other);
      const dx = entity.x - other.x;
      const dy = entity.y - other.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= minDistance) {
        continue;
      }
      const overlap = (minDistance - distance) * strength;
      const angle = (entity.id + other.id) * goldenAngle;
      const shiftX =
        (distance === 0 ? Math.cos(angle) : dx / distance) * overlap;
      const shiftY =
        (distance === 0 ? Math.sin(angle) : dy / distance) * overlap;
      if (other.kind === EntityKind.Mage) {
        push(world, entity, shiftX, shiftY);
      } else {
        push(world, entity, shiftX / 2, shiftY / 2);
        push(world, other, -shiftX / 2, -shiftY / 2);
      }
    }
  }
};
