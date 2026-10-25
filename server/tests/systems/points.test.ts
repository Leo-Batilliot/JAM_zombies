import { describe, expect, test } from "vitest";
import { damage } from "../../src/systems/death.js";
import { createMassGrave } from "../../src/systems/points.js";
import { createBench } from "../support/bench.js";

describe("searching a point of interest", () => {
  test("takes the search time near the point", () => {
    const { config, world, addArmy, step } = createBench((config) => {
      Object.assign(config.world.pointsOfInterest["mass-grave"] ?? {}, {
        searchSec: 2,
        radius: 3,
      });
    });
    const army = addArmy(100, 100);
    createMassGrave(world, 101, 100, [
      { type: "zombie", item: undefined },
      { type: "zombie", item: undefined },
    ]);
    step(config.network.tickRate);
    expect(army.units.size).toBe(0);
    step(config.network.tickRate + 1);
    expect(army.units.size).toBe(2);
  });

  test("does nothing out of range", () => {
    const { config, world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    createMassGrave(world, 120, 100, [{ type: "zombie", item: undefined }]);
    step(config.network.tickRate * 5);
    expect(army.units.size).toBe(0);
    expect(army.search).toBeUndefined();
  });

  test("is interrupted when the mage is attacked", () => {
    const { config, world, addArmy, step } = createBench((config) => {
      Object.assign(config.world.pointsOfInterest["mass-grave"] ?? {}, {
        searchSec: 2,
      });
    });
    const army = addArmy(100, 100);
    createMassGrave(world, 101, 100, [{ type: "zombie", item: undefined }]);
    step(config.network.tickRate * 1.5);
    damage(world, army.mage, 1, undefined);
    step();
    expect(army.search).toBeUndefined();
    step(config.network.tickRate);
    expect(army.units.size).toBe(0);
    step(config.network.tickRate * 1.5);
    expect(army.units.size).toBe(1);
  });

  test("an army never searches the same point twice", () => {
    const { config, world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    const point = createMassGrave(world, 101, 100, [
      { type: "zombie", item: undefined },
    ]);
    point?.searchedBy.add(army);
    step(config.network.tickRate * 3);
    expect(army.search).toBeUndefined();
    expect(army.units.size).toBe(0);
  });
});

describe("lifetime", () => {
  test("a point disappears at the end of its lifetime and comes back elsewhere", () => {
    const { config, world, step } = createBench((config) => {
      Object.assign(config.world.pointsOfInterest["mass-grave"] ?? {}, {
        count: 2,
        lifetimeSec: { min: 1, max: 1 },
      });
    });
    step();
    const first = [...world.points];
    expect(first).toHaveLength(2);
    step(config.network.tickRate + 1);
    const second = [...world.points];
    expect(second).toHaveLength(2);
    expect(second.some((point) => first.includes(point))).toBe(false);
  });
});

describe("mass grave", () => {
  test("the first looter takes every corpse and the grave disappears", () => {
    const { config, world, addArmy, step } = createBench();
    const first = addArmy(100, 100);
    const second = addArmy(101, 101);
    const grave = createMassGrave(world, 100.5, 100.5, [
      { type: "zombie", item: undefined },
      { type: "zombie", item: undefined },
    ]);
    step(config.network.tickRate * 3);
    expect(first.units.size + second.units.size).toBe(2);
    expect(world.points.has(grave as never)).toBe(false);
  });

  test("is not created without corpses", () => {
    const { world } = createBench();
    expect(createMassGrave(world, 10, 10, [])).toBeUndefined();
    expect(world.points.size).toBe(0);
  });

  test("raised units come with the rising flag time", () => {
    const { config, world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    createMassGrave(world, 100, 100, [{ type: "zombie", item: undefined }]);
    step(config.network.tickRate * 3);
    expect([...army.units][0]?.raisedAt).toBeGreaterThan(0);
  });
});
