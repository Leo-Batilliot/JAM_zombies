import { describe, expect, test } from "vitest";
import { buildRegistries, generateCity, toClientConfig } from "@horde/shared";
import { loadConfig } from "../../src/config/load.js";
import { World } from "../../src/world/world.js";
import {
  createBench,
  seededRandom,
  sharedConfigDir,
} from "../support/bench.js";

describe("World", () => {
  test("builds the same city as the one the client draws from its seed", () => {
    const config = loadConfig(sharedConfigDir);
    const world = new World(config, buildRegistries(config), seededRandom(5));
    const sent = toClientConfig(config, world.citySeed);
    expect(
      generateCity(
        sent.world.city,
        sent.world.width,
        sent.world.height,
        sent.citySeed,
      ),
    ).toEqual(world.city);
  });

  test("picks random points inside the map, away from the edges", () => {
    const { world, config } = createBench();
    const { width, height, spawnMargin } = config.world;
    for (let index = 0; index < 100; index++) {
      const { x, y } = world.randomPoint();
      expect(x).toBeGreaterThanOrEqual(spawnMargin);
      expect(x).toBeLessThanOrEqual(width - spawnMargin);
      expect(y).toBeGreaterThanOrEqual(spawnMargin);
      expect(y).toBeLessThanOrEqual(height - spawnMargin);
    }
  });

  test("gives each entity its own id and indexes it in the grid", () => {
    const { world, addArmy } = createBench();
    const first = addArmy(10, 10);
    const second = addArmy(10, 10);
    expect(first.mage.id).not.toBe(second.mage.id);
    expect(world.grid.queryRadius(10, 10, 1)).toHaveLength(2);
  });

  test("gives each army its own slot and reuses freed slots", () => {
    const { world, addArmy } = createBench();
    const first = addArmy(10, 10);
    const second = addArmy(10, 10);
    expect(second.slot).not.toBe(first.slot);
    world.removeArmy(first);
    expect(addArmy(10, 10).slot).toBe(first.slot);
  });

  test("removes an army with its mage and units", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(10, 10);
    world.addUnit(army, "zombie", 11, 10);
    world.removeArmy(army);
    expect(world.entities.size).toBe(0);
    expect(world.grid.size).toBe(0);
    expect(world.armies.size).toBe(0);
  });

  test("counts ticks and time", () => {
    const { config, world, step } = createBench();
    step(config.network.tickRate);
    expect(world.tick).toBe(config.network.tickRate);
    expect(world.time).toBeCloseTo(1);
  });
});
