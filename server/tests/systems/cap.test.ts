import { describe, expect, test } from "vitest";
import { kill } from "../../src/systems/death.js";
import { armyPace, enlist } from "../../src/systems/enlist.js";
import { killMage } from "../../src/systems/mage.js";
import { createBench } from "../support/bench.js";

const capBench = (cap: number) =>
  createBench((config) => {
    config.gameplay.army.cap = cap;
    config.gameplay.souls.perStrength = 1;
  });

describe("army cap", () => {
  test("a unit beyond the cap becomes souls", () => {
    const { world, addArmy } = capBench(2);
    const army = addArmy(100, 100);
    world.addUnit(army, "zombie", 101, 100);
    world.addUnit(army, "zombie", 101, 100);
    const unit = enlist(
      world,
      army,
      { type: "big-zombie", item: "shovel" },
      100,
      100,
    );
    expect(unit).toBeUndefined();
    expect(army.units.size).toBe(2);
    expect(army.souls).toBe(world.registries.units.get("big-zombie").strength);
    expect(army.inventory).toEqual(["shovel"]);
  });

  test("a corpse raised beyond the cap becomes souls", () => {
    const { config, world, addArmy, step } = capBench(1);
    const army = addArmy(100, 100);
    const dead = world.addUnit(army, "zombie", 101, 100);
    kill(world, dead, undefined);
    world.addUnit(army, "zombie", 101, 100);
    step(config.gameplay.reanimation.delaySec * config.network.tickRate + 1);
    expect(army.units.size).toBe(1);
    expect(army.corpses.size).toBe(0);
    expect(army.souls).toBe(1);
  });

  test("living units handed over beyond the cap become souls for the killer", () => {
    const { world, addArmy } = createBench((config) => {
      config.gameplay.army.cap = 3;
      config.gameplay.transfer.share = 1;
    });
    const army = addArmy(100, 100);
    const killer = addArmy(130, 100, "Killer");
    for (let index = 0; index < 4; index++) {
      world.addUnit(army, "zombie", 101, 100);
    }
    world.addUnit(killer, "zombie", 131, 100);
    killMage(world, army, killer);
    expect(killer.units.size).toBe(3);
    expect(killer.souls).toBeGreaterThan(0);
    expect(world.points.size).toBe(0);
  });
});

describe("army slowdown", () => {
  const paceWith = (count: number): number => {
    const { world, addArmy } = createBench((config) => {
      config.gameplay.army.slowdown = { from: 60, to: 150, penalty: 0.35 };
      config.gameplay.army.cap = 200;
    });
    const army = addArmy(100, 100);
    for (let index = 0; index < count; index++) {
      world.addUnit(army, "zombie", 100, 100);
    }
    return armyPace(world, army);
  };

  test("starts after the threshold and grows up to the penalty", () => {
    expect(paceWith(10)).toBe(1);
    expect(paceWith(60)).toBe(1);
    expect(paceWith(105)).toBeCloseTo(0.825);
    expect(paceWith(150)).toBeCloseTo(0.65);
    expect(paceWith(180)).toBeCloseTo(0.65);
  });

  test("slows the mage", () => {
    const { config, world, addArmy, step } = createBench((config) => {
      config.gameplay.army.slowdown = { from: 0, to: 1, penalty: 0.5 };
    });
    const army = addArmy(100, 100);
    world.addUnit(army, "zombie", 100, 100);
    army.mage.targetX = 200;
    step(config.network.tickRate);
    expect(army.mage.x - 100).toBeCloseTo(config.gameplay.mage.speed * 0.5, 1);
  });
});
