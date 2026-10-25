import { describe, expect, test } from "vitest";
import type { Config } from "@horde/shared";
import { startEvent } from "../../src/systems/events.js";
import { orderMove } from "../../src/systems/orders.js";
import { createBench } from "../support/bench.js";

const sturdy = (config: Config): void => {
  const zombie = config.units.units["zombie"];
  if (zombie !== undefined) {
    zombie.hp = 100000;
  }
};

describe("battle detection", () => {
  test("an enemy unit within the engagement radius starts a battle", () => {
    const { world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    const enemy = addArmy(112, 100, "Enemy");
    const bystander = addArmy(300, 300, "Far");
    world.addUnit(army, "zombie", 103, 100);
    world.addUnit(enemy, "zombie", 108, 100);
    step();
    expect(army.battle?.foes.map((foe) => foe.army)).toEqual([enemy]);
    expect(enemy.battle?.foes.map((foe) => foe.army)).toEqual([army]);
    expect(bystander.battle).toBeUndefined();
  });

  test("units farther than the engagement radius do not start a battle", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      config.gameplay.battle.engageRadius = 3;
    });
    const army = addArmy(100, 100);
    const enemy = addArmy(115, 100, "Enemy");
    world.addUnit(army, "zombie", 103, 100);
    world.addUnit(enemy, "zombie", 110, 100);
    step();
    expect(config.units.units["zombie"]?.aggroRange).toBeGreaterThan(7);
    expect(army.battle).toBeUndefined();
  });

  test("the battle ends after the delay without contact", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      config.gameplay.battle.endDelaySec = 1;
    });
    const army = addArmy(100, 100);
    const enemy = addArmy(112, 100, "Enemy");
    world.addUnit(army, "zombie", 103, 100);
    const foe = world.addUnit(enemy, "zombie", 108, 100);
    step();
    expect(army.battle).toBeDefined();
    world.removeEntity(foe);
    step(config.network.tickRate / 2);
    expect(army.battle).toBeDefined();
    step(config.network.tickRate);
    expect(army.battle).toBeUndefined();
  });

  test("a hostile npc starts a battle", () => {
    const { world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    world.addUnit(army, "zombie", 101, 100);
    startEvent(world, "pumpkin", 105, 100);
    step();
    expect(army.battle).toBeDefined();
    expect(army.battle?.foes[0]?.army).toBeUndefined();
  });

  test("civilians do not start a battle", () => {
    const { world, addArmy, addCivilians, step } = createBench();
    const army = addArmy(100, 100);
    world.addUnit(army, "zombie", 101, 100);
    addCivilians(104, 100, 3);
    step();
    expect(army.battle).toBeUndefined();
  });
});

describe("movement in battle", () => {
  test("the mage moves freely during a battle", () => {
    const { world, config, addArmy, step } = createBench(sturdy);
    const army = addArmy(100, 100);
    const enemy = addArmy(110, 100, "Enemy");
    world.addUnit(army, "zombie", 103, 100);
    world.addUnit(enemy, "zombie", 106, 100);
    step();
    expect(army.battle).toBeDefined();
    orderMove(world, army, 60, 100);
    step(config.network.tickRate * 5);
    expect(army.mage.x).toBeLessThan(80);
  });
});

describe("reanimation in battle", () => {
  test("corpses wait until the battle is over", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      sturdy(config);
      config.gameplay.reanimation.delaySec = 1;
      config.gameplay.battle.endDelaySec = 0.5;
    });
    const army = addArmy(100, 100);
    const enemy = addArmy(112, 100, "Enemy");
    world.addUnit(army, "zombie", 103, 100);
    const foe = world.addUnit(enemy, "zombie", 108, 100);
    const corpse = world.addCorpse("zombie", army, enemy, 99, 100);
    step(config.network.tickRate * 2);
    expect(army.battle).toBeDefined();
    expect(army.corpses.has(corpse)).toBe(true);
    world.removeEntity(foe);
    step(config.network.tickRate);
    expect(army.battle).toBeUndefined();
    expect(army.corpses.size).toBe(0);
    expect(army.units.size).toBe(2);
  });
});
