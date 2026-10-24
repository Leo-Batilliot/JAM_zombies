import { EntityKind } from "@horde/shared";
import { isBody, type Body, type World } from "../world/world.js";
import { bodyRadius, isFixedNpc, largestMovingRadius } from "./bodies.js";

const goldenAngle = Math.PI * (3 - Math.sqrt(5));

const push = (world: World, entity: Body, dx: number, dy: number): void => {
  world.setPosition(entity, entity.x + dx, entity.y + dy);
};

export const separateBodies = (world: World): void => {
  const strength = world.config.gameplay.movement.separation;
  const reach = largestMovingRadius(world);
  const near: number[] = [];
  for (const entity of world.entities.values()) {
    if (!isBody(entity) || entity.kind === EntityKind.Mage) {
      continue;
    }
    const fixed = isFixedNpc(world, entity);
    const radius = bodyRadius(world, entity);
    near.length = 0;
    world.grid.queryRadius(entity.x, entity.y, radius + reach, near);
    for (const otherId of near) {
      const other = world.entities.get(otherId);
      if (
        other === undefined ||
        other === entity ||
        !isBody(other) ||
        isFixedNpc(world, other)
      ) {
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
      if (fixed) {
        push(world, other, -shiftX, -shiftY);
      } else if (other.kind === EntityKind.Mage) {
        push(world, entity, shiftX, shiftY);
      } else {
        push(world, entity, shiftX / 2, shiftY / 2);
        push(world, other, -shiftX / 2, -shiftY / 2);
      }
    }
  }
};
