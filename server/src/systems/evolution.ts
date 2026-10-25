import type { Army, Unit, World } from "../world/world.js";
import { distance } from "./bodies.js";
import { bestItem, equipInventory, fits } from "./equipment.js";

export interface EvolutionSource {
  type: string;
  cost: number;
}

export const evolutionSource = (
  world: World,
  into: string,
): EvolutionSource | undefined => {
  for (const [type, unit] of world.registries.units.entries()) {
    const evolution = unit.evolutions.find((entry) => entry.into === into);
    if (evolution !== undefined) {
      return { type, cost: evolution.cost };
    }
  }
  return undefined;
};

export const evolvableCounts = (
  world: World,
  army: Army,
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const unit of army.units) {
    if (
      unit.group === undefined &&
      world.registries.units.get(unit.type).evolutions.length > 0
    ) {
      counts.set(unit.type, (counts.get(unit.type) ?? 0) + 1);
    }
  }
  return counts;
};

const sacrifices = (
  army: Army,
  source: EvolutionSource,
): Unit[] | undefined => {
  const candidates = [...army.units].filter(
    (unit) => unit.type === source.type && unit.group === undefined,
  );
  if (candidates.length < source.cost) {
    return undefined;
  }
  return candidates
    .sort((a, b) => distance(a, army.mage) - distance(b, army.mage))
    .slice(0, source.cost);
};

export const evolve = (world: World, army: Army, into: string): boolean => {
  const source = army.alive ? evolutionSource(world, into) : undefined;
  const units = source === undefined ? undefined : sacrifices(army, source);
  if (units === undefined) {
    return false;
  }
  const items = units.flatMap((unit) =>
    unit.item === undefined ? [] : [unit.item],
  );
  const kept = bestItem(
    world,
    items.filter((item) => fits(world, item, into)),
  );
  let x = 0;
  let y = 0;
  for (const unit of units) {
    x += unit.x / units.length;
    y += unit.y / units.length;
    world.removeEntity(unit);
  }
  world.addUnit(army, into, x, y, kept).raisedAt = world.time;
  const keptIndex = kept === undefined ? -1 : items.indexOf(kept);
  army.inventory.push(...items.filter((_, index) => index !== keptIndex));
  equipInventory(world, army);
  return true;
};
