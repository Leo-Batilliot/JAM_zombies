import { describe, expect, test } from "vitest";
import { setMageTarget } from "../../src/systems/movement.js";
import { createBench } from "../support/bench.js";

describe("mage movement", () => {
  test("moves toward the target at the configured speed", () => {
    const { config, world, addArmy, step } = createBench((config) => {
      config.gameplay.mage.speed = 5;
    });
    const { mage } = addArmy(100, 100);
    setMageTarget(world, mage, 200, 100);
    step(config.network.tickRate);
    expect(mage.x).toBeCloseTo(105);
    expect(mage.y).toBeCloseTo(100);
  });

  test("stops exactly on the target", () => {
    const { world, addArmy, step } = createBench();
    const { mage } = addArmy(100, 100);
    setMageTarget(world, mage, 101, 101);
    step(100);
    expect(mage.x).toBe(101);
    expect(mage.y).toBe(101);
  });

  test("stops at the edges of the map", () => {
    const { config, world, addArmy, step } = createBench();
    const { mage } = addArmy(10, 10);
    setMageTarget(world, mage, -500, config.world.height + 500);
    step(10000);
    expect(mage.x).toBe(0);
    expect(mage.y).toBe(config.world.height);
  });

  test("keeps the grid in sync", () => {
    const { world, addArmy, step } = createBench();
    const { mage } = addArmy(100, 100);
    setMageTarget(world, mage, 150, 100);
    step(1000);
    expect(world.grid.queryRadius(150, 100, 1)).toEqual([mage.id]);
    expect(world.grid.queryRadius(100, 100, 1)).toEqual([]);
  });
});

describe("march speed", () => {
  test("the mage waits for its slowest unit", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      config.gameplay.army.slowdown.factor = 0;
    });
    const army = addArmy(100, 100);
    world.addUnit(army, "bone-ballista", 100, 98);
    setMageTarget(world, army.mage, 200, 100);
    step(config.network.tickRate);
    expect(army.mage.x - 100).toBeCloseTo(
      config.units.units["bone-ballista"]?.speed ?? 0,
      1,
    );
  });
});

describe("formation heading", () => {
  test("a short move does not turn the formation", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    setMageTarget(world, army.mage, 103, 100);
    expect(army.headingTarget).toEqual({ x: 0, y: 1 });
  });

  test("a long move in a new direction turns it progressively", () => {
    const { world, config, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    setMageTarget(world, army.mage, 200, 100);
    expect(army.headingTarget.x).toBeCloseTo(1);
    step();
    expect(army.heading.x).toBeGreaterThan(0);
    expect(army.heading.x).toBeLessThan(1);
    step(config.network.tickRate * 2);
    expect(army.heading.x).toBeCloseTo(1);
  });
});
