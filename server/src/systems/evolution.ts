import type { Army, Card, Remains, Unit, World } from "../world/world.js";
import { distance } from "./bodies.js";
import { bestItem, equipInventory, fits } from "./equipment.js";

export const lineageBase = (world: World, type: string): string => {
  const node = world.registries.tree.get(type);
  return node === undefined
    ? type
    : (world.config.units.lineages[node.lineage]?.base ?? type);
};

export const isAllowed = (world: World, army: Army, type: string): boolean => {
  const node = world.registries.tree.get(type);
  if (node === undefined || node.tier === 0) {
    return true;
  }
  const mutation = army.mutations.get(node.lineage);
  return (
    mutation !== undefined &&
    mutation.branch === node.branch &&
    mutation.tier >= node.tier
  );
};

export const baseRemains = (world: World, army: Army, remains: Remains) => {
  if (isAllowed(world, army, remains.type)) {
    return [remains];
  }
  if (remains.item !== undefined) {
    army.inventory.push(remains.item);
  }
  const count = world.registries.units.get(remains.type).strength;
  const type = lineageBase(world, remains.type);
  return Array.from({ length: count }, () => ({ type, item: undefined }));
};

const branchPath = (
  world: World,
  lineage: string,
  branch: string,
): string[] => {
  const entry = world.config.units.lineages[lineage];
  return entry === undefined
    ? []
    : [entry.base, ...(entry.branches[branch]?.tiers ?? [])];
};

const mutationCards = (world: World, army: Army): Card[] => {
  const cards: Card[] = [];
  for (const [lineage, entry] of Object.entries(world.config.units.lineages)) {
    const mutation = army.mutations.get(lineage);
    if (mutation === undefined) {
      for (const { tiers } of Object.values(entry.branches)) {
        const [first] = tiers;
        if (first !== undefined) {
          cards.push({ kind: "mutation", unit: first });
        }
      }
      continue;
    }
    const next = branchPath(world, lineage, mutation.branch)[mutation.tier + 1];
    if (next !== undefined) {
      cards.push({ kind: "mutation", unit: next });
    }
  }
  return cards;
};

const presentLineages = (world: World, army: Army): Set<string> => {
  const lineages = new Set<string>();
  for (const unit of army.units) {
    const node = world.registries.tree.get(unit.type);
    if (node !== undefined) {
      lineages.add(node.lineage);
    }
  }
  return lineages;
};

const cardWeight = (world: World, card: Card, present: Set<string>): number => {
  const rules = world.config.gameplay.levelUp;
  switch (card.kind) {
    case "mutation": {
      const node = world.registries.tree.get(card.unit);
      return (
        rules.mutationWeight *
        (node !== undefined && present.has(node.lineage)
          ? rules.presentWeight
          : 1)
      );
    }
    case "gift":
      return rules.giftWeight;
    case "spell":
      return rules.spellWeight;
  }
};

export const candidateCards = (world: World, army: Army): Card[] => [
  ...mutationCards(world, army),
  ...world.registries.gifts
    .entries()
    .filter(([id, gift]) => (army.gifts.get(id) ?? 0) < gift.maxStacks)
    .map(([gift]): Card => ({ kind: "gift", gift })),
  ...world.registries.spells
    .ids()
    .filter((spell) => spell !== army.spell)
    .map((spell): Card => ({ kind: "spell", spell })),
];

const drawCards = (world: World, army: Army): Card[] => {
  const present = presentLineages(world, army);
  const pool = candidateCards(world, army)
    .map((card) => ({ card, weight: cardWeight(world, card, present) }))
    .filter((entry) => entry.weight > 0);
  const drawn: Card[] = [];
  while (drawn.length < world.config.gameplay.levelUp.choices) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    if (total <= 0) {
      break;
    }
    let roll = world.random() * total;
    const index = pool.findIndex((entry) => (roll -= entry.weight) < 0);
    const [entry] = pool.splice(index < 0 ? pool.length - 1 : index, 1);
    if (entry !== undefined) {
      drawn.push(entry.card);
    }
  }
  return drawn;
};

export const offerCards = (world: World, army: Army): void => {
  if (army.alive && army.cards.length === 0 && army.pendingLevels > 0) {
    army.cards = drawCards(world, army);
    if (army.cards.length === 0) {
      army.pendingLevels = 0;
    }
  }
};

const applyCard = (world: World, army: Army, card: Card): void => {
  switch (card.kind) {
    case "mutation": {
      const node = world.registries.tree.get(card.unit);
      if (node?.branch !== undefined) {
        army.mutations.set(node.lineage, {
          branch: node.branch,
          tier: node.tier,
        });
        army.run.mutations.push(card.unit);
      }
      break;
    }
    case "gift": {
      army.gifts.set(card.gift, (army.gifts.get(card.gift) ?? 0) + 1);
      const gift = world.registries.gifts.get(card.gift);
      if (gift.effect === "hp") {
        army.mage.hp += gift.value;
      }
      break;
    }
    case "spell":
      army.spell = card.spell;
      army.spellReadyAt = world.time;
      break;
  }
};

export const chooseCard = (
  world: World,
  army: Army,
  index: number,
): boolean => {
  const card = army.cards[index];
  if (!army.alive || card === undefined) {
    return false;
  }
  applyCard(world, army, card);
  army.cards = [];
  army.pendingLevels = Math.max(0, army.pendingLevels - 1);
  offerCards(world, army);
  return true;
};

const fusionGroup = (unit: Unit, others: Unit[], size: number): Unit[] =>
  [unit, ...others.filter((other) => other !== unit)]
    .sort((a, b) => distance(a, unit) - distance(b, unit))
    .slice(0, size);

const fuse = (world: World, army: Army, units: Unit[], into: string): void => {
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
};

export const fuseUnits = (world: World, army: Army): void => {
  const ratio = world.config.units.fusionRatio;
  let fused = false;
  for (const [lineage, mutation] of army.mutations) {
    const path = branchPath(world, lineage, mutation.branch);
    for (let tier = 0; tier < mutation.tier; tier++) {
      const type = path[tier];
      const into = path[tier + 1];
      if (type === undefined || into === undefined) {
        break;
      }
      const ready = [...army.units].filter(
        (unit) =>
          unit.type === type && unit.group === undefined && !unit.fighting,
      );
      while (ready.length >= ratio) {
        const group = fusionGroup(ready[0] as Unit, ready, ratio);
        for (const unit of group) {
          ready.splice(ready.indexOf(unit), 1);
        }
        fuse(world, army, group, into);
        fused = true;
      }
    }
  }
  if (fused) {
    equipInventory(world, army);
  }
};

export const fuseArmies = (world: World): void => {
  const { intervalSec } = world.config.gameplay.fusion;
  for (const army of world.armies.values()) {
    if (army.alive && world.time >= army.fusionAt) {
      army.fusionAt = world.time + intervalSec;
      fuseUnits(world, army);
    }
  }
};
