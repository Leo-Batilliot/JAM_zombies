import type { Config } from "./config/schema.js";

export class RegistryError extends Error {
  override name = "RegistryError";
}

export class Registry<T> {
  readonly #entries: ReadonlyMap<string, T>;

  constructor(
    readonly label: string,
    entries: Record<string, T>,
  ) {
    this.#entries = new Map(Object.entries(entries));
  }

  get(id: string): T {
    const entry = this.#entries.get(id);
    if (entry === undefined) {
      throw new RegistryError(`Unknown ${this.label} "${id}"`);
    }
    return entry;
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
    checkReference(registries.units, npc.corpse, `Corpse of npc "${npcId}"`);
  }

  return registries;
};
