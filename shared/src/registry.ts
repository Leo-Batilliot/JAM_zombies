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
type ProjectileType = Config["units"]["projectiles"][string];
type MistType = Config["world"]["mists"][string];
type SkinType = Config["gameplay"]["mage"]["skins"][string];
type GiftType = Config["gameplay"]["gifts"][string];
type SpellType = Config["gameplay"]["spells"][string];

export interface TreeNode {
  lineage: string;
  branch: string | undefined;
  tier: number;
}

export interface Registries {
  units: Registry<UnitType>;
  npcs: Registry<NpcType>;
  items: Registry<ItemType>;
  pointsOfInterest: Registry<PointOfInterestType>;
  events: Registry<EventType>;
  projectiles: Registry<ProjectileType>;
  mists: Registry<MistType>;
  skins: Registry<SkinType>;
  gifts: Registry<GiftType>;
  spells: Registry<SpellType>;
  tree: ReadonlyMap<string, TreeNode>;
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

const checkCombat = (config: Config, registries: Registries): void => {
  for (const [unitId, unit] of registries.units.entries()) {
    if (unit.projectile !== undefined) {
      checkReference(
        registries.projectiles,
        unit.projectile,
        `Projectile of unit "${unitId}"`,
      );
    }
  }
  for (const [npcId, npc] of registries.npcs.entries()) {
    if (npc.attack?.projectile !== undefined) {
      checkReference(
        registries.projectiles,
        npc.attack.projectile,
        `Projectile of npc "${npcId}"`,
      );
    }
  }
  for (const [pointId, point] of registries.pointsOfInterest.entries()) {
    if (point.reward === "units" && point.units === undefined) {
      throw new RegistryError(`Point of interest "${pointId}" has no units`);
    }
    if (point.units !== undefined) {
      checkReference(
        registries.units,
        point.units.unit,
        `Units of "${pointId}"`,
      );
    }
  }
  const { camps } = config.world;
  for (const { npc } of camps.defenders) {
    checkReference(registries.npcs, npc, "Camp defender");
    if (registries.npcs.get(npc).attack === undefined) {
      throw new RegistryError(`Camp defender "${npc}" has no attack`);
    }
  }
  checkReference(registries.pointsOfInterest, camps.chest, "Camp chest");
  for (const formation of Object.values(config.lobby.bots.formations)) {
    if (!Object.hasOwn(config.formations.selectable, formation)) {
      throw new RegistryError(
        `Bots reference unknown formation "${formation}"`,
      );
    }
  }
};

const buildTree = (config: Config): Map<string, TreeNode> => {
  const tree = new Map<string, TreeNode>();
  const place = (unitId: string, node: TreeNode): void => {
    const unit = config.units.units[unitId];
    if (unit === undefined) {
      throw new RegistryError(
        `Lineage "${node.lineage}" references unknown unit "${unitId}"`,
      );
    }
    if (tree.has(unitId)) {
      throw new RegistryError(`Unit "${unitId}" is in two lineages`);
    }
    if (unit.family !== node.lineage) {
      throw new RegistryError(
        `Unit "${unitId}" has family "${unit.family}" but is in lineage "${node.lineage}"`,
      );
    }
    if (unit.strength !== config.units.fusionRatio ** node.tier) {
      throw new RegistryError(
        `Unit "${unitId}" must have a strength of ${String(config.units.fusionRatio ** node.tier)}`,
      );
    }
    tree.set(unitId, node);
  };
  for (const [lineage, entry] of Object.entries(config.units.lineages)) {
    place(entry.base, { lineage, branch: undefined, tier: 0 });
    for (const [branch, { tiers }] of Object.entries(entry.branches)) {
      tiers.forEach((unitId, index) => {
        place(unitId, { lineage, branch, tier: index + 1 });
      });
    }
  }
  return tree;
};

const requireFields = (
  source: string,
  entry: Record<string, unknown>,
  fields: string[],
): void => {
  for (const field of fields) {
    if (entry[field] === undefined) {
      throw new RegistryError(`${source} needs "${field}"`);
    }
  }
};

const spellFields: Record<SpellType["effect"], string[]> = {
  nova: ["radius", "damage"],
  rally: ["durationSec", "multiplier"],
  wall: ["durationSec", "length", "spacing", "offset", "npc"],
  raise: ["radius"],
};

const checkPowers = (registries: Registries): void => {
  for (const [giftId, gift] of registries.gifts.entries()) {
    if (gift.effect === "heal") {
      requireFields(`Gift "${giftId}"`, gift, ["radius"]);
    }
  }
  for (const [spellId, spell] of registries.spells.entries()) {
    requireFields(`Spell "${spellId}"`, spell, spellFields[spell.effect]);
    if (spell.npc !== undefined) {
      checkReference(registries.npcs, spell.npc, `Spell "${spellId}"`);
      if (!registries.npcs.get(spell.npc).obstacle) {
        throw new RegistryError(`Wall npc "${spell.npc}" must be an obstacle`);
      }
    }
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
    projectiles: new Registry("projectile", config.units.projectiles),
    mists: new Registry("mist", config.world.mists),
    skins: new Registry("skin", config.gameplay.mage.skins),
    gifts: new Registry("gift", config.gameplay.gifts),
    spells: new Registry("spell", config.gameplay.spells),
    tree: buildTree(config),
  };

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
  checkCombat(config, registries);
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

  for (const unitId of registries.units.ids()) {
    if (!registries.tree.has(unitId)) {
      throw new RegistryError(`Unit "${unitId}" is in no lineage`);
    }
  }
  checkPowers(registries);

  return registries;
};
