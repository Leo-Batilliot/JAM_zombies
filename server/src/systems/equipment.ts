import type { Army, Unit, World } from "../world/world.js";

export interface LootEntry {
  item: string;
  weight: number;
}

export const itemRank = (world: World, item: string): number =>
  world.registries.items.has(item)
    ? world.config.equipment.rarities.indexOf(
        world.registries.items.get(item).rarity,
      )
    : -1;

export const bestItem = (
  world: World,
  items: Iterable<string>,
): string | undefined => {
  let best: string | undefined;
  for (const item of items) {
    if (best === undefined || itemRank(world, item) > itemRank(world, best)) {
      best = item;
    }
  }
  return best;
};

export const fits = (world: World, item: string, type: string): boolean =>
  world.registries.items.has(item) &&
  world.registries.units.get(type).equipment ===
    world.registries.items.get(item).category;

const itemOf = (world: World, unit: Unit) =>
  unit.item !== undefined && world.registries.items.has(unit.item)
    ? world.registries.items.get(unit.item)
    : undefined;

export const damageBonus = (world: World, unit: Unit): number =>
  itemOf(world, unit)?.damage ?? 1;

export const armorOf = (world: World, unit: Unit): number =>
  itemOf(world, unit)?.armor ?? 0;

export const equip = (world: World, unit: Unit, item: string): void => {
  const before = world.unitMaxHp(unit.type, unit.item);
  unit.item = item;
  unit.hp += world.unitMaxHp(unit.type, item) - before;
};

export const drawWeighted = <T>(
  world: World,
  entries: T[],
  weight: (entry: T) => number,
): T | undefined => {
  const total = entries.reduce((sum, entry) => sum + weight(entry), 0);
  let roll = world.random() * total;
  for (const entry of entries) {
    roll -= weight(entry);
    if (roll < 0) {
      return entry;
    }
  }
  return entries[entries.length - 1];
};

export const drawLoot = (world: World, loot: LootEntry[]): string | undefined =>
  drawWeighted(world, loot, (entry) => entry.weight)?.item;

export const grantItem = (world: World, army: Army, item: string): void => {
  army.inventory.push(item);
  army.found.push(item);
  equipInventory(world, army);
};

const bestFreeUnit = (
  world: World,
  army: Army,
  item: string,
): Unit | undefined => {
  let best: Unit | undefined;
  let bestStrength = -Infinity;
  for (const unit of army.units) {
    const { strength } = world.registries.units.get(unit.type);
    if (
      unit.item === undefined &&
      unit.group === undefined &&
      strength > bestStrength &&
      fits(world, item, unit.type)
    ) {
      best = unit;
      bestStrength = strength;
    }
  }
  return best;
};

export const equipInventory = (world: World, army: Army): void => {
  if (army.inventory.length === 0) {
    return;
  }
  army.inventory.sort((a, b) => itemRank(world, b) - itemRank(world, a));
  army.inventory = army.inventory.filter((item) => {
    const unit = bestFreeUnit(world, army, item);
    if (unit === undefined) {
      return true;
    }
    equip(world, unit, item);
    return false;
  });
};

export const clearFound = (world: World): void => {
  for (const army of world.armies.values()) {
    army.found.length = 0;
  }
};

export const equipArmies = (world: World): void => {
  for (const army of world.armies.values()) {
    equipInventory(world, army);
  }
};
