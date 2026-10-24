import { describe, expect, test } from "vitest";
import { spawnArmy } from "../../src/systems/army.js";
import { createBench } from "../support/bench.js";

describe("starting army", () => {
  test("spawns the configured units around the mage", () => {
    const { config, world } = createBench((config) => {
      config.gameplay.army.startingUnits = [{ unit: "zombie", count: 5 }];
      config.gameplay.army.spawnRadius = 2;
    });
    const army = spawnArmy(world, "Ash");
    expect(army.units.size).toBe(5);
    for (const unit of army.units) {
      expect(unit.type).toBe("zombie");
      expect(unit.army).toBe(army);
      expect(
        Math.hypot(unit.x - army.mage.x, unit.y - army.mage.y),
      ).toBeCloseTo(config.gameplay.army.spawnRadius);
    }
    expect(world.entities.size).toBe(6);
  });

  test("gives each army its own units", () => {
    const { world } = createBench();
    const first = spawnArmy(world, "Ash");
    const second = spawnArmy(world, "Evil Ash");
    const shared = [...first.units].filter((unit) => second.units.has(unit));
    expect(shared).toEqual([]);
  });
});
