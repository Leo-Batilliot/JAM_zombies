import { describe, expect, test } from "vitest";
import { EntityKind, type Config } from "@horde/shared";
import { kill } from "../../src/systems/death.js";
import {
  candidateCards,
  chooseCard,
  fuseUnits,
  isAllowed,
} from "../../src/systems/evolution.js";
import { killMage } from "../../src/systems/mage.js";
import { grantSouls, maxHp } from "../../src/systems/souls.js";
import { castSpell } from "../../src/systems/spells.js";
import { currentTarget } from "../../src/systems/targeting.js";
import type { Army, Card, World } from "../../src/world/world.js";
import { createBench } from "../support/bench.js";

const types = (army: Army): string[] =>
  [...army.units].map((unit) => unit.type).sort();

const give = (world: World, army: Army, card: Card): void => {
  army.pendingLevels = 1;
  army.cards = [card];
  chooseCard(world, army, 0);
};

const addUnits = (world: World, army: Army, type: string, count: number) =>
  Array.from({ length: count }, (_, index) =>
    world.addUnit(army, type, 101 + index * 0.1, 100),
  );

describe("level up", () => {
  test("each new level offers three cards", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    grantSouls(world, army, config.gameplay.souls.levelBase);
    expect(army.level).toBe(2);
    expect(army.cards).toHaveLength(config.gameplay.levelUp.choices);
    expect(army.pendingLevels).toBe(1);
  });

  test("several levels wait their turn, one choice at a time", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    grantSouls(world, army, 1000);
    const levels = army.pendingLevels;
    expect(levels).toBeGreaterThan(1);
    expect(chooseCard(world, army, 0)).toBe(true);
    expect(army.pendingLevels).toBe(levels - 1);
    expect(army.cards.length).toBeGreaterThan(0);
  });

  test("lineages already in the army come up more often", () => {
    const { world, addArmy } = createBench((config: Config) => {
      config.gameplay.levelUp.choices = 2;
      config.gameplay.levelUp.presentWeight = 1e6;
      config.gameplay.levelUp.giftWeight = 0;
      config.gameplay.levelUp.spellWeight = 0;
    });
    const army = addArmy(100, 100);
    addUnits(world, army, "skeleton-archer", 3);
    grantSouls(world, army, 10);
    expect(
      army.cards.every(
        (card) =>
          card.kind === "mutation" &&
          world.registries.tree.get(card.unit)?.lineage === "skeleton",
      ),
    ).toBe(true);
  });

  test("taking a branch closes the other one and opens its next tier", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    give(world, army, { kind: "mutation", unit: "ghoul" });
    const mutations = candidateCards(world, army).flatMap((card) =>
      card.kind === "mutation" ? [card.unit] : [],
    );
    expect(mutations).toContain("stalker");
    expect(mutations).not.toContain("big-zombie");
    expect(mutations).not.toContain("ghoul");
  });
});

describe("fusion", () => {
  test("units fuse by pairs into the chosen tier", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    give(world, army, { kind: "mutation", unit: "ghoul" });
    addUnits(world, army, "zombie", 3);
    fuseUnits(world, army);
    expect(types(army)).toEqual(["ghoul", "zombie"]);
    addUnits(world, army, "zombie", 1);
    fuseUnits(world, army);
    expect(types(army)).toEqual(["ghoul", "ghoul"]);
  });

  test("fusion climbs every tier up to the mutation", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    give(world, army, { kind: "mutation", unit: "ghoul" });
    give(world, army, { kind: "mutation", unit: "stalker" });
    addUnits(world, army, "zombie", 5);
    fuseUnits(world, army);
    expect(types(army)).toEqual(["stalker", "zombie"]);
  });

  test("the fused unit keeps the best item, the rest goes back", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    give(world, army, { kind: "mutation", unit: "big-zombie" });
    world.addUnit(army, "zombie", 101, 100, "shovel");
    world.addUnit(army, "zombie", 101, 100, "chainsaw");
    fuseUnits(world, army);
    const [fused] = [...army.units];
    expect(fused?.type).toBe("big-zombie");
    expect(fused?.item).toBe("chainsaw");
    expect(army.inventory).toEqual(["shovel"]);
  });

  test("abandoned and fighting units wait before fusing", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    give(world, army, { kind: "mutation", unit: "big-zombie" });
    const [first, second] = addUnits(world, army, "zombie", 2);
    if (first !== undefined) {
      first.fighting = true;
    }
    fuseUnits(world, army);
    expect(types(army)).toEqual(["zombie", "zombie"]);
    if (first !== undefined && second !== undefined) {
      first.fighting = false;
      second.fighting = false;
    }
    fuseUnits(world, army);
    expect(types(army)).toEqual(["big-zombie"]);
  });

  test("units fuse on their own during the game", () => {
    const { world, config, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    give(world, army, { kind: "mutation", unit: "mastiff" });
    addUnits(world, army, "zombie-dog", 2);
    step(config.network.tickRate);
    expect(types(army)).toEqual(["mastiff"]);
  });
});

describe("units changing hands", () => {
  test("a received unit is recounted with the mutations of its new army", () => {
    const { world, addArmy } = createBench((config) => {
      config.gameplay.transfer.share = 1;
    });
    const loser = addArmy(100, 100, "Loser");
    const winner = addArmy(140, 100, "Winner");
    give(world, loser, { kind: "mutation", unit: "big-zombie" });
    give(world, winner, { kind: "mutation", unit: "ghoul" });
    world.addUnit(loser, "big-zombie", 101, 100);
    killMage(world, loser, winner);
    expect(types(winner)).toEqual(["zombie", "zombie"]);
    fuseUnits(world, winner);
    expect(types(winner)).toEqual(["ghoul"]);
  });

  test("a mutated unit rises again at the same tier", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      config.gameplay.reanimation.delaySec = 0;
    });
    const army = addArmy(100, 100);
    give(world, army, { kind: "mutation", unit: "big-zombie" });
    const unit = world.addUnit(army, "big-zombie", 101, 100);
    kill(world, unit, undefined);
    step(config.network.tickRate);
    expect(types(army)).toEqual(["big-zombie"]);
  });

  test("only the allowed tiers of the army stay as they are", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    expect(isAllowed(world, army, "zombie")).toBe(true);
    expect(isAllowed(world, army, "ghoul")).toBe(false);
    give(world, army, { kind: "mutation", unit: "ghoul" });
    expect(isAllowed(world, army, "ghoul")).toBe(true);
    expect(isAllowed(world, army, "stalker")).toBe(false);
  });
});

describe("death", () => {
  test("the mage loses its level, mutations, gifts and spell", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    give(world, army, { kind: "mutation", unit: "ghoul" });
    give(world, army, { kind: "gift", gift: "vigor" });
    give(world, army, { kind: "spell", spell: "rallying-cry" });
    grantSouls(world, army, 100);
    killMage(world, army, undefined);
    expect(army.level).toBe(1);
    expect(army.mutations.size).toBe(0);
    expect(army.gifts.size).toBe(0);
    expect(army.spell).toBeUndefined();
    expect(army.cards).toEqual([]);
    expect(army.lastRun?.mutations).toEqual([
      world.registries.units.index("ghoul"),
    ]);
  });

  test("the run counts infections, kills and slain mages", () => {
    const { world, addArmy, addCivilians } = createBench();
    const army = addArmy(100, 100);
    const victim = addArmy(140, 100, "Victim");
    const [civilian] = addCivilians(120, 100, 1).members;
    if (civilian !== undefined) {
      kill(world, civilian, army);
    }
    killMage(world, victim, army);
    killMage(world, army, undefined);
    expect(army.lastRun).toMatchObject({
      infected: 1,
      kills: 1,
      mageKills: 1,
    });
  });
});

describe("gifts", () => {
  test("vigor raises the mage hp", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    const before = maxHp(world, army);
    give(world, army, { kind: "gift", gift: "vigor" });
    expect(maxHp(world, army)).toBe(
      before + (config.gameplay.gifts["vigor"]?.value ?? 0),
    );
    expect(army.mage.hp).toBe(maxHp(world, army));
  });

  test("the necrotic aura heals the troops near the mage", () => {
    const { world, config, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    give(world, army, { kind: "gift", gift: "necrotic-aura" });
    const [unit] = addUnits(world, army, "zombie", 1);
    if (unit !== undefined) {
      unit.hp = 1;
    }
    step(config.network.tickRate);
    expect(unit?.hp).toBeGreaterThan(1);
  });

  test("a gift cannot be taken more than its maximum", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    army.gifts.set("haste", config.gameplay.gifts["haste"]?.maxStacks ?? 0);
    expect(
      candidateCards(world, army).some(
        (card) => card.kind === "gift" && card.gift === "haste",
      ),
    ).toBe(false);
  });
});

describe("spells", () => {
  test("the nova hurts the enemies around the mage, then recharges", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const enemy = addArmy(140, 100, "Enemy");
    const foe = world.addUnit(enemy, "zombie", 102, 100);
    const friend = world.addUnit(army, "zombie", 101, 100);
    give(world, army, { kind: "spell", spell: "necrotic-nova" });
    const hp = friend.hp;
    expect(castSpell(world, army)).toBe(true);
    expect(world.entities.has(foe.id)).toBe(false);
    expect(friend.hp).toBe(hp);
    expect(castSpell(world, army)).toBe(false);
  });

  test("the bone wall blocks for a while and nobody attacks it", () => {
    const { world, config, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    const enemy = addArmy(120, 100, "Enemy");
    const foe = world.addUnit(enemy, "zombie", 97, 100);
    give(world, army, { kind: "spell", spell: "bone-wall" });
    castSpell(world, army);
    const walls = [...world.entities.values()].filter(
      (entity) => entity.kind === EntityKind.Npc,
    );
    expect(walls.length).toBeGreaterThan(0);
    step();
    expect(currentTarget(world, foe)?.kind).not.toBe(EntityKind.Npc);
    step(config.network.tickRate * 10);
    expect(
      [...world.entities.values()].some(
        (entity) => entity.kind === EntityKind.Npc,
      ),
    ).toBe(false);
  });

  test("raise dead brings the nearby corpses back at once, out of battle", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    world.addCorpse("zombie", army, undefined, 103, 100);
    give(world, army, { kind: "spell", spell: "raise-dead" });
    expect(castSpell(world, army)).toBe(true);
    expect(types(army)).toEqual(["zombie"]);
    expect(army.corpses.size).toBe(0);
  });

  test("the rallying cry speeds up the army for a while", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    give(world, army, { kind: "spell", spell: "rallying-cry" });
    castSpell(world, army);
    expect(army.rally.multiplier).toBe(
      config.gameplay.spells["rallying-cry"]?.multiplier,
    );
    expect(army.rally.until).toBeGreaterThan(world.time);
  });
});
