import type { SnapshotEntity } from "@horde/shared";
import type { World } from "../world/world.js";

export interface View {
  width: number;
  height: number;
}

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
      entities.push({ id, kind: entity.kind, x: entity.x, y: entity.y });
    }
  }
  return entities;
};
