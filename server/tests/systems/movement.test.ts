import { describe, expect, test } from "vitest";
import { setMageTarget } from "../../src/systems/movement.js";
import { createBench } from "../support/bench.js";

describe("mage movement", () => {
  test("moves toward the target at the configured speed", () => {
    const { config, world, addMage, step } = createBench((config) => {
      config.gameplay.mage.speed = 5;
    });
    const mage = addMage(100, 100);
    setMageTarget(world, mage, 200, 100);
    step(config.network.tickRate);
    expect(mage.x).toBeCloseTo(105);
    expect(mage.y).toBeCloseTo(100);
  });

  test("stops exactly on the target", () => {
    const { world, addMage, step } = createBench();
    const mage = addMage(100, 100);
    setMageTarget(world, mage, 101, 101);
    step(100);
    expect(mage.x).toBe(101);
    expect(mage.y).toBe(101);
  });

  test("stops at the edges of the map", () => {
    const { config, world, addMage, step } = createBench();
    const mage = addMage(10, 10);
    setMageTarget(world, mage, -500, config.world.height + 500);
    step(10000);
    expect(mage.x).toBe(0);
    expect(mage.y).toBe(config.world.height);
  });

  test("keeps the grid in sync", () => {
    const { world, addMage, step } = createBench();
    const mage = addMage(100, 100);
    setMageTarget(world, mage, 150, 100);
    step(1000);
    expect(world.grid.queryRadius(150, 100, 1)).toEqual([mage.id]);
    expect(world.grid.queryRadius(100, 100, 1)).toEqual([]);
  });
});
