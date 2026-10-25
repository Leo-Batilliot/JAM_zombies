import {
  EntityFlag,
  EntityKind,
  maxFlagLevel,
  neutralArmy,
  levelFlags,
  type SnapshotEntity,
} from "@horde/shared";
import { corpseDelay } from "../systems/reanimation.js";
import type { Army, Cross, Entity, World } from "../world/world.js";

export interface View {
  width: number;
  height: number;
}

const typeIndex = (world: World, entity: Entity): number => {
  switch (entity.kind) {
    case EntityKind.Mage:
      return 0;
    case EntityKind.Unit:
    case EntityKind.Corpse:
      return world.registries.units.index(entity.type);
    case EntityKind.Npc:
      return world.registries.npcs.index(entity.type);
    case EntityKind.PointOfInterest:
      return world.registries.pointsOfInterest.index(entity.type);
    case EntityKind.Cross:
      return 0;
  }
};

const armySlot = (entity: Entity): number => {
  switch (entity.kind) {
    case EntityKind.Mage:
    case EntityKind.Unit:
      return entity.army.slot;
    case EntityKind.Corpse:
      return entity.owner.slot;
    case EntityKind.Npc:
    case EntityKind.PointOfInterest:
    case EntityKind.Cross:
      return neutralArmy;
  }
};

const crossCharge = (world: World, cross: Cross): number => {
  const { rechargeSec } = world.config.world.crosses;
  const left = cross.readyAt - world.time;
  return left <= 0 || rechargeSec <= 0
    ? maxFlagLevel
    : Math.floor((1 - left / rechargeSec) * maxFlagLevel);
};

const flags = (world: World, entity: Entity, viewer: Army): number => {
  switch (entity.kind) {
    case EntityKind.Unit:
      return (
        (entity.fighting ? EntityFlag.Fighting : 0) |
        (world.time - entity.raisedAt <
        world.config.gameplay.reanimation.riseSec
          ? EntityFlag.Rising
          : 0) |
        (entity.group === undefined ? 0 : EntityFlag.Abandoned)
      );
    case EntityKind.Corpse:
      return world.time - entity.diedAt >= corpseDelay(world, entity)
        ? EntityFlag.Waiting
        : 0;
    case EntityKind.Npc:
      return entity.fighting ? EntityFlag.Fighting : 0;
    case EntityKind.PointOfInterest:
      return (
        (entity.searchedBy.has(viewer) ? EntityFlag.Searched : 0) |
        levelFlags(Math.log2(Math.max(1, entity.corpses.length)))
      );
    case EntityKind.Cross:
      return levelFlags(crossCharge(world, entity));
    default:
      return 0;
  }
};

const toSnapshot = (
  world: World,
  entity: Entity,
  viewer: Army,
): SnapshotEntity => ({
  id: entity.id,
  kind: entity.kind,
  type: typeIndex(world, entity),
  army: armySlot(entity),
  flags: flags(world, entity, viewer),
  x: entity.x,
  y: entity.y,
});

export const visibleEntities = (
  world: World,
  viewer: Army,
  view: View,
): SnapshotEntity[] => {
  const { x, y } = viewer.mage;
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
      entities.push(toSnapshot(world, entity, viewer));
    }
  }
  return entities;
};
