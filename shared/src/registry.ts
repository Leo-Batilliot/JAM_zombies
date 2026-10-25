import type { Config } from "./config/schema.js";
import { maxFlagLevel } from "./protocol/messages.js";

export class RegistryError extends Error {
  override name = "RegistryError";
}

export class Registry<T> {
  readonly #entries: ReadonlyMap<string, T>;
  readonly #indexes: ReadonlyMap<string, number>;

  constructor(
    readonly label: string,
    entries: Record<string, T>,
  ) {
    this.#entries = new Map(Object.entries(entries));
    this.#indexes = new Map(Object.keys(entries).map((key, i) => [key, i]));
  }

  get(id: string): T {
    const entry = this.#entries.get(id);
    if (entry === undefined) {
      throw new RegistryError(`Unknown ${this.label} "${id}"`);
    }
    return entry;
  }

  index(id: string): number {
    const index = this.#indexes.get(id);
    if (index === undefined) {
      throw new RegistryError(`Unknown ${this.label} "${id}"`);
    }
    return index;
  }

  has(id: string): boolean {
    return this.#entries.has(id);
  }

  ids(): string[] {
    return [...this.#entries.keys()];
  }

  entries(): [string, T][] {
    return [...this.#entries.entries()];
  }
}

type UnitType = Config["units"]["units"][string];
type NpcType = Config["units"]["npcs"][string];
type ItemType = Config["equipment"]["items"][string];
type PointOfInterestType = Config["world"]["pointsOfInterest"][string];
type EventType = Config["events"]["events"][string];

export interface Registries {
  units: Registry<UnitType>;
  npcs: Registry<NpcType>;
  items: Registry<ItemType>;
  pointsOfInterest: Registry<PointOfInterestType>;
  events: Registry<EventType>;
}

const checkReference = (
  registry: Registry<unknown>,
  id: string,
  source: string,
): void => {
  if (!registry.has(id)) {
    throw new RegistryError(
      `${source} references unknown ${registry.label} "${id}"`,
    );
  }
};

const checkLoot = (
  registries: Registries,
  loot: { item: string }[],
  source: string,
): void => {
  for (const { item } of loot) {
    checkReference(registries.items, item, source);
  }
};

const checkItems = (registries: Registries): void => {
  const perCategory = new Map<string, number>();
  for (const [, item] of registries.items.entries()) {
    perCategory.set(item.category, (perCategory.get(item.category) ?? 0) + 1);
  }
  for (const [category, count] of perCategory) {
    if (count > maxFlagLevel) {
      throw new RegistryError(
        `Category "${category}" has more than ${String(maxFlagLevel)} items`,
      );
    }
  }
  for (const [pointId, point] of registries.pointsOfInterest.entries()) {
    if (point.reward === "items" && point.loot === undefined) {
      throw new RegistryError(`Point of interest "${pointId}" has no loot`);
    }
    checkLoot(registries, point.loot ?? [], `Loot of "${pointId}"`);
  }
  for (const [eventId, event] of registries.events.entries()) {
    checkLoot(registries, event.rewardLoot, `Reward of event "${eventId}"`);
    checkReference(
      registries.items,
      event.rewardLegendary,
      `Legendary reward of event "${eventId}"`,
    );
  }
};

export const buildRegistries = (config: Config): Registries => {
  const registries: Registries = {
    units: new Registry("unit", config.units.units),
    npcs: new Registry("npc", config.units.npcs),
    items: new Registry("item", config.equipment.items),
    pointsOfInterest: new Registry(
      "point of interest",
      config.world.pointsOfInterest,
    ),
    events: new Registry("event", config.events.events),
  };

  for (const [unitId, unit] of registries.units.entries()) {
    for (const evolution of unit.evolutions) {
      checkReference(
        registries.units,
        evolution.into,
        `Evolution of unit "${unitId}"`,
      );
    }
  }
  for (const [npcId, npc] of registries.npcs.entries()) {
    if (npc.corpse !== undefined) {
      checkReference(registries.units, npc.corpse, `Corpse of npc "${npcId}"`);
    }
  }
  for (const { npc } of config.world.populations) {
    checkReference(registries.npcs, npc, "Population");
    if (registries.npcs.get(npc).fleeSpeed === undefined) {
      throw new RegistryError(`Population npc "${npc}" has no fleeSpeed`);
    }
  }
  for (const [eventId, event] of registries.events.entries()) {
    checkReference(registries.npcs, event.boss, `Boss of event "${eventId}"`);
    checkReference(
      registries.npcs,
      event.minion,
      `Minion of event "${eventId}"`,
    );
  }
  checkReference(
    registries.pointsOfInterest,
    config.world.massGrave,
    "Mass grave",
  );
  checkItems(registries);
  for (const { unit } of config.gameplay.army.startingUnits) {
    checkReference(registries.units, unit, "Starting army");
  }
  checkReference(registries.events, config.gameplay.demo.event, "Demo");
  checkReference(registries.units, config.gameplay.demo.unit, "Demo");
  if (
    config.gameplay.respawn.delaySec * 1000 <=
    config.client.screamer.durationMs
  ) {
    throw new RegistryError("Respawn delay must exceed the screamer duration");
  }

  return registries;
};
