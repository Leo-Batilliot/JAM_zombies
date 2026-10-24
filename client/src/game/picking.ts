import { EntityKind, type SnapshotEntity } from "@horde/shared";

const targetable = new Set([EntityKind.Unit, EntityKind.Npc]);

export const pickEnemy = (
  entities: SnapshotEntity[],
  x: number,
  y: number,
  radius: number,
  ownArmy: number | undefined,
): SnapshotEntity | undefined => {
  let best: SnapshotEntity | undefined;
  let bestDistance = radius;
  for (const entity of entities) {
    if (!targetable.has(entity.kind) || entity.army === ownArmy) {
      continue;
    }
    const distance = Math.hypot(entity.x - x, entity.y - y);
    if (distance <= bestDistance) {
      best = entity;
      bestDistance = distance;
    }
  }
  return best;
};
