import { describe, expect, test } from "vitest";
import {
  evolutionSource,
  evolvableCounts,
  evolve,
} from "../../src/systems/evolution.js";
import { createBench } from "../support/bench.js";

const fill = (
  bench: ReturnType<typeof createBench>,
  army: ReturnType<ReturnType<typeof createBench>["addArmy"]>,
  count: number,
) =>
  Array.from({ length: count }, (_, index) =>
    bench.world.addUnit(army, "zombie", 101 + index * 0.5, 100),
  );

describe("evolution", () => {
  test("finds the base type and cost of an evolution", () => {
    const { world } = createBench();
    expect(evolutionSource(world, "big-zombie")).toEqual({
      type: "zombie",
      cost: 5,
    });
    expect(evolutionSource(world, "zombie")).toBeUndefined();
  });

  test("sacrifices 5 zombies for a big zombie", () => {
    const bench = createBench();
    const army = bench.addArmy(100, 100);
    fill(bench, army, 7);
    expect(evolve(bench.world, army, "big-zombie")).toBe(true);
    const types = [...army.units].map((unit) => unit.type).sort();
    expect(types).toEqual(["big-zombie", "zombie", "zombie"]);
  });

  test("sacrifices the zombies closest to the mage", () => {
    const bench = createBench();
    const army = bench.addArmy(100, 100);
    const units = fill(bench, army, 6);
    evolve(bench.world, army, "big-zombie");
    expect(army.units.has(units[5] as never)).toBe(true);
  });

  test("is refused without enough units, for an unknown type or a dead mage", () => {
    const bench = createBench();
    const army = bench.addArmy(100, 100);
    fill(bench, army, 4);
    expect(evolve(bench.world, army, "big-zombie")).toBe(false);
    fill(bench, army, 1);
    expect(evolve(bench.world, army, "golem")).toBe(false);
    army.alive = false;
    expect(evolve(bench.world, army, "big-zombie")).toBe(false);
    expect(army.units.size).toBe(5);
  });

  test("abandoned units are not sacrificed", () => {
    const bench = createBench();
    const army = bench.addArmy(100, 100);
    const units = fill(bench, army, 5);
    const [first] = units;
    if (first !== undefined) {
      first.group = {
        army,
        units: new Set([first]),
        corpses: new Set(),
        anchorX: 0,
        anchorY: 0,
        engagedAt: 0,
      };
    }
    expect(evolvableCounts(bench.world, army).get("zombie")).toBe(4);
    expect(evolve(bench.world, army, "big-zombie")).toBe(false);
  });

  test("the new unit keeps the best item, the rest goes back to the inventory", () => {
    const bench = createBench();
    const army = bench.addArmy(100, 100);
    const units = fill(bench, army, 5);
    const items = ["shovel", "chainsaw", "cricket-bat"];
    items.forEach((item, index) => {
      const unit = units[index];
      if (unit !== undefined) {
        unit.item = item;
      }
    });
    evolve(bench.world, army, "big-zombie");
    const [big] = army.units;
    expect(big?.item).toBe("chainsaw");
    expect([...army.inventory].sort()).toEqual(["cricket-bat", "shovel"]);
  });

  test("items from the sacrifice equip the other units", () => {
    const bench = createBench();
    const army = bench.addArmy(100, 100);
    const units = fill(bench, army, 5);
    const spare = bench.world.addUnit(army, "zombie", 120, 100);
    for (const unit of units.slice(0, 2)) {
      unit.item = "shovel";
    }
    evolve(bench.world, army, "big-zombie");
    expect(spare.item).toBe("shovel");
    expect(army.inventory).toEqual([]);
  });
});
