import { EntityKind, type SnapshotEntity } from "@horde/shared";
import type { Entity, World } from "../world/world.js";

export interface View {
  width: number;
  height: number;
}

const toSnapshot = (world: World, entity: Entity): SnapshotEntity => ({
  id: entity.id,
  kind: entity.kind,
  type:
    entity.kind === EntityKind.Unit
      ? world.registries.units.index(entity.type)
      : 0,
  army: entity.army.slot,
  flags: 0,
  x: entity.x,
  y: entity.y,
});

export const visibleEntities = (
  world: World,
  x: number,
  y: number,
  view: View,
): SnapshotEntity[] => {
  const { interestMargin, maxViewSize } = world.config.network;
  const halfWidth = Math.min(view.width, maxViewSize) / 2 + interestMargin;
  const halfHeight = Math.min(view.height, maxViewSize) / 2 + interestMargin;
  const ids = world.grid.queryRect(
    x - halfWidth,
    y - halfHeight,
    x + halfWidth,
    y + halfHeight,
  );
  const entities: SnapshotEntity[] = [];
  for (const id of ids) {
    const entity = world.entities.get(id);
    if (entity !== undefined) {
      entities.push(toSnapshot(world, entity));
    }
  }
  return entities;
};
