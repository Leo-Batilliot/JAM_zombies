import { describe, expect, test } from "vitest";
import { kill } from "../../src/systems/death.js";
import { enlist } from "../../src/systems/enlist.js";
import { killMage } from "../../src/systems/mage.js";
import { powerPace } from "../../src/systems/pace.js";
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
    enlist(world, army, { type: "big-zombie", item: "shovel" }, 100, 100);
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
  const paceWith = (type: string, count: number): number => {
    const { world, addArmy } = createBench((config) => {
      config.gameplay.army.slowdown = { scale: 70, factor: 0.185, max: 0.6 };
      config.gameplay.army.cap = 700;
    });
    const army = addArmy(100, 100);
    for (let index = 0; index < count; index++) {
      world.addUnit(army, type, 100, 100);
    }
    return powerPace(world, army);
  };

  test("grows with the strength on a logarithmic curve", () => {
    expect(paceWith("zombie", 0)).toBe(1);
    expect(paceWith("zombie", 50)).toBeCloseTo(0.9, 1);
    expect(paceWith("zombie", 200)).toBeCloseTo(0.75, 1);
    expect(paceWith("zombie", 600)).toBeCloseTo(0.6, 1);
  });

  test("counts the strength, not the number of units", () => {
    expect(paceWith("big-zombie", 25)).toBeCloseTo(paceWith("zombie", 50));
  });

  test("slows the mage", () => {
    const { config, world, addArmy, step } = createBench((config) => {
      config.gameplay.army.slowdown = { scale: 1, factor: 1, max: 0.5 };
    });
    const army = addArmy(100, 100);
    world.addUnit(army, "big-zombie", 100, 100);
    army.mage.targetX = 200;
    step(config.network.tickRate);
    expect(army.mage.x - 100).toBeCloseTo(config.gameplay.mage.speed * 0.5, 1);
  });
});
