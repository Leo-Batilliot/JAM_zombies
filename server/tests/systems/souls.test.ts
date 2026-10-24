import { describe, expect, test } from "vitest";
import { kill } from "../../src/systems/death.js";
import {
  grantSouls,
  levelForSouls,
  maxHp,
  soulsToReach,
} from "../../src/systems/souls.js";
import { createBench } from "../support/bench.js";

const rules = { perStrength: 1, levelBase: 10, levelGrowth: 2 };

describe("levels", () => {
  test("each level costs more souls than the previous one", () => {
    expect(soulsToReach(1, rules)).toBe(0);
    expect(soulsToReach(2, rules)).toBe(10);
    expect(soulsToReach(3, rules)).toBe(30);
    expect(soulsToReach(4, rules)).toBe(70);
  });

  test("the level follows the souls collected", () => {
    expect(levelForSouls(0, rules)).toBe(1);
    expect(levelForSouls(29, rules)).toBe(2);
    expect(levelForSouls(30, rules)).toBe(3);
  });
});

describe("souls", () => {
  test("killing an enemy gives souls according to its strength", () => {
    const { world, addArmy, addCivilians } = createBench((config) => {
      config.gameplay.souls.perStrength = 3;
      Object.assign(config.units.npcs["civilian"] ?? {}, { strength: 2 });
    });
    const killer = addArmy(100, 100);
    const npc = [...addCivilians(110, 100, 1).members][0];
    if (npc === undefined) {
      throw new Error("Expected a civilian");
    }
    kill(world, npc, killer);
    expect(killer.souls).toBe(6);
  });

  test("leveling up raises the max hp and heals the difference", () => {
    const { world, addArmy } = createBench((config) => {
      config.gameplay.souls = rules;
      config.gameplay.mage.baseHp = 100;
      config.gameplay.mage.hpPerLevel = 20;
    });
    const army = addArmy(100, 100);
    army.mage.hp = 50;
    grantSouls(world, army, 30);
    expect(army.level).toBe(3);
    expect(maxHp(world, army)).toBe(140);
    expect(army.mage.hp).toBe(90);
  });
});
