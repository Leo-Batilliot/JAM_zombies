import { describe, expect, test } from "vitest";
import { setMageTarget } from "../../src/systems/movement.js";
import { formationSlots, slotOffsets } from "../../src/systems/formation.js";
import type { Config } from "@horde/shared";
import { createBench } from "../support/bench.js";

const layout = {
  name: "Test",
  layout: "block" as const,
  spacing: 1,
  frontOffset: 2,
  backOffset: 3,
  width: 1,
  speed: 1,
  defense: 0,
  fullGuard: false,
};

const withArcher = (config: Config): void => {
  const zombie = config.units.units["zombie"];
  if (zombie !== undefined) {
    config.units.units["skeleton-archer"] = {
      ...zombie,
      family: "skeleton",
      rank: "back",
    };
  }
};

describe("slotOffsets", () => {
  test("places front units ahead and back units behind", () => {
    const offsets = slotOffsets(4, 2, layout);
    expect(offsets.slice(0, 4).every((slot) => slot.forward >= 2)).toBe(true);
    expect(offsets.slice(4).every((slot) => slot.forward <= -3)).toBe(true);
  });

  test("centers each row on the mage", () => {
    const offsets = slotOffsets(5, 0, layout);
    expect(offsets.map((slot) => slot.right)).toEqual([-1, 0, 1, -0.5, 0.5]);
    expect(offsets.map((slot) => slot.forward)).toEqual([2, 2, 2, 3, 3]);
  });
});

describe("formationSlots", () => {
  test("turns the formation after a long move", () => {
    const bench = createBench((config) => {
      config.formations.neutral = layout;
      withArcher(config);
    });
    const army = bench.addArmy(100, 100);
    const front = bench.world.addUnit(army, "zombie", 100, 100);
    const back = bench.world.addUnit(army, "skeleton-archer", 100, 100);
    setMageTarget(bench.world, army.mage, 200, 100);
    bench.step(bench.config.network.tickRate * 2);
    bench.world.setPosition(army.mage, 100, 100);
    const slots = formationSlots(bench.world, army);
    expect(slots.get(front)).toEqual({ x: 102, y: 100 });
    expect(slots.get(back)).toEqual({ x: 97, y: 100 });
  });
});

describe("following the mage", () => {
  test("units reach their slot around a moving mage", () => {
    const { config, world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    for (let index = 0; index < 5; index++) {
      world.addUnit(army, "zombie", 100, 100);
    }
    setMageTarget(world, army.mage, 130, 100);
    step(config.network.tickRate * 10);
    const slots = formationSlots(world, army);
    for (const [unit, slot] of slots) {
      expect(Math.hypot(unit.x - slot.x, unit.y - slot.y)).toBeLessThan(0.5);
    }
  });

  test("units never overlap each other or the mage", () => {
    const { config, world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    for (let index = 0; index < 30; index++) {
      world.addUnit(army, "zombie", 100, 100);
    }
    step(config.network.tickRate * 5);
    const { radius } = config.units.units["zombie"] ?? { radius: 0 };
    const units = [...army.units];
    for (const unit of units) {
      expect(
        Math.hypot(unit.x - army.mage.x, unit.y - army.mage.y),
      ).toBeGreaterThan(radius + config.gameplay.mage.radius - 0.1);
      for (const other of units) {
        if (other !== unit) {
          expect(
            Math.hypot(unit.x - other.x, unit.y - other.y),
          ).toBeGreaterThan(radius * 2 - 0.1);
        }
      }
    }
  });
});
