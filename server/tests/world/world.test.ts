import { describe, expect, test } from "vitest";
import { createBench } from "../support/bench.js";

describe("World", () => {
  test("spawns mages inside the map, away from the edges", () => {
    const { world, config } = createBench();
    const { width, height, spawnMargin } = config.world;
    for (let index = 0; index < 100; index++) {
      const mage = world.spawnMage();
      expect(mage.x).toBeGreaterThanOrEqual(spawnMargin);
      expect(mage.x).toBeLessThanOrEqual(width - spawnMargin);
      expect(mage.y).toBeGreaterThanOrEqual(spawnMargin);
      expect(mage.y).toBeLessThanOrEqual(height - spawnMargin);
    }
  });

  test("gives each entity its own id and indexes it in the grid", () => {
    const { world, addMage } = createBench();
    const first = addMage(10, 10);
    const second = addMage(10, 10);
    expect(first.id).not.toBe(second.id);
    expect(world.grid.queryRadius(10, 10, 1)).toHaveLength(2);
  });

  test("removes an entity from the world and the grid", () => {
    const { world, addMage } = createBench();
    const mage = addMage(10, 10);
    world.remove(mage.id);
    expect(world.entities.size).toBe(0);
    expect(world.grid.size).toBe(0);
  });

  test("counts ticks", () => {
    const { world, step } = createBench();
    step(5);
    expect(world.tick).toBe(5);
  });
});
