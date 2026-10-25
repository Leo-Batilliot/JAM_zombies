import {
  EntityFlag,
  EntityKind,
  maxFlagLevel,
  neutralArmy,
  levelFlags,
  quantizeHp,
  type Registries,
  type SnapshotEntity,
} from "@horde/shared";
import { bombingProgress } from "../systems/bombings.js";
import { corpseDelay } from "../systems/reanimation.js";
import { maxHp } from "../systems/souls.js";
import type {
  Army,
  Bombing,
  Cross,
  Entity,
  Unit,
  World,
} from "../world/world.js";

export interface View {
  width: number;
  height: number;
}

const typeIndex = (world: World, entity: Entity): number => {
  switch (entity.kind) {
    case EntityKind.Mage:
      return world.registries.skins.has(entity.army.skin)
        ? world.registries.skins.index(entity.army.skin)
        : 0;
    case EntityKind.Unit:
    case EntityKind.Corpse:
      return world.registries.units.index(entity.type);
    case EntityKind.Npc:
      return world.registries.npcs.index(entity.type);
    case EntityKind.PointOfInterest:
      return world.registries.pointsOfInterest.index(entity.type);
    case EntityKind.Projectile:
      return world.registries.projectiles.index(entity.type);
    case EntityKind.Mist:
      return world.registries.mists.index(entity.type);
    case EntityKind.Cross:
    case EntityKind.Camp:
    case EntityKind.Bombing:
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
    case EntityKind.Projectile:
      return entity.attacker?.slot ?? neutralArmy;
    case EntityKind.Npc:
    case EntityKind.PointOfInterest:
    case EntityKind.Cross:
    case EntityKind.Mist:
    case EntityKind.Camp:
    case EntityKind.Bombing:
      return neutralArmy;
  }
};

const itemSlots = new WeakMap<Registries["items"], Map<string, number>>();

const slotsOf = (items: Registries["items"]): Map<string, number> => {
  let slots = itemSlots.get(items);
  if (slots === undefined) {
    const perCategory = new Map<string, number>();
    slots = new Map();
    for (const [id, { category }] of items.entries()) {
      const slot = (perCategory.get(category) ?? 0) + 1;
      perCategory.set(category, slot);
      slots.set(id, slot);
    }
    itemSlots.set(items, slots);
  }
  return slots;
};

const itemSlot = (world: World, unit: Unit): number =>
  unit.item === undefined
    ? 0
    : (slotsOf(world.registries.items).get(unit.item) ?? 0);

const crossCharge = (world: World, cross: Cross): number => {
  const { rechargeSec } = world.config.world.crosses;
  const left = cross.readyAt - world.time;
  return left <= 0 || rechargeSec <= 0
    ? maxFlagLevel
    : Math.floor((1 - left / rechargeSec) * maxFlagLevel);
};

const bombingStage = (world: World, bombing: Bombing): number =>
  bombing.struck
    ? maxFlagLevel
    : Math.min(
        Math.floor(bombingProgress(world, bombing) * maxFlagLevel),
        maxFlagLevel - 1,
      );

const flags = (
  world: World,
  entity: Entity,
  viewer: Army | undefined,
): number => {
  switch (entity.kind) {
    case EntityKind.Unit:
      return (
        (entity.fighting ? EntityFlag.Fighting : 0) |
        (world.time - entity.raisedAt <
        world.config.gameplay.reanimation.riseSec
          ? EntityFlag.Rising
          : 0) |
        (entity.group === undefined ? 0 : EntityFlag.Abandoned) |
        levelFlags(itemSlot(world, entity))
      );
    case EntityKind.Corpse:
      return world.time - entity.diedAt >= corpseDelay(world, entity)
        ? EntityFlag.Waiting
        : 0;
    case EntityKind.Npc:
      return entity.fighting ? EntityFlag.Fighting : 0;
    case EntityKind.PointOfInterest:
      return (
        (viewer !== undefined && entity.searchedBy.has(viewer)
          ? EntityFlag.Searched
          : 0) | levelFlags(Math.log2(Math.max(1, entity.corpses.length)))
      );
    case EntityKind.Cross:
      return levelFlags(crossCharge(world, entity));
    case EntityKind.Bombing:
      return levelFlags(bombingStage(world, entity));
    default:
      return 0;
  }
};

const health = (world: World, entity: Entity): number => {
  switch (entity.kind) {
    case EntityKind.Mage:
      return quantizeHp(entity.hp / maxHp(world, entity.army));
    case EntityKind.Unit:
      return quantizeHp(entity.hp / world.unitMaxHp(entity.type, entity.item));
    case EntityKind.Npc:
      return quantizeHp(entity.hp / world.registries.npcs.get(entity.type).hp);
    default:
      return 0;
  }
};

const toSnapshot = (
  world: World,
  entity: Entity,
  viewer: Army | undefined,
): SnapshotEntity => ({
  id: entity.id,
  kind: entity.kind,
  type: typeIndex(world, entity),
  army: armySlot(entity),
  flags: flags(world, entity, viewer),
  hp: health(world, entity),
  x: entity.x,
  y: entity.y,
});

export const visibleEntities = (
  world: World,
  viewer: Army | undefined,
  view: View,
): SnapshotEntity[] => {
  const { x, y } = viewer?.mage ?? {
    x: world.config.world.width / 2,
    y: world.config.world.height / 2,
  };
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
    if (entity !== undefined && entity.kind !== EntityKind.Mist) {
      entities.push(toSnapshot(world, entity, viewer));
    }
  }
  for (const mist of world.mists) {
    entities.push(toSnapshot(world, mist, viewer));
  }
  return entities;
};
