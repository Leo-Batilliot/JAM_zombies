import { describe, expect, test } from "vitest";
import { maintainCrosses } from "../../src/systems/crosses.js";
import { createBench } from "../support/bench.js";

const crossBench = () =>
  createBench((config) => {
    Object.assign(config.world.crosses, {
      count: 0,
      radius: 6,
      threshold: 10,
      rechargeSec: 5,
    });
    config.gameplay.reanimation.delaySec = 2;
    config.gameplay.reanimation.crossDelaySec = 8;
  });

const fill = (
  bench: ReturnType<typeof createBench>,
  army: ReturnType<ReturnType<typeof createBench>["addArmy"]>,
  count: number,
  x: number,
  y: number,
) =>
  Array.from({ length: count }, () =>
    bench.world.addUnit(army, "zombie", x, y),
  );

describe("sacred crosses", () => {
  test("are spread over the map up to their count", () => {
    const { world, config } = createBench((config) => {
      Object.assign(config.world.crosses, { count: 4, spacing: 60 });
    });
    maintainCrosses(world);
    const crosses = [...world.crosses];
    expect(crosses).toHaveLength(config.world.crosses.count);
    for (const cross of crosses) {
      for (const other of crosses) {
        if (other !== cross) {
          expect(
            Math.hypot(cross.x - other.x, cross.y - other.y),
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  test("measure the strength of each army inside", () => {
    const bench = crossBench();
    const cross = bench.world.addCross(100, 100, 600);
    const army = bench.addArmy(90, 90);
    fill(bench, army, 4, 101, 100);
    fill(bench, army, 3, 120, 100);
    bench.step();
    expect(cross.strengths.get(army)).toBe(4);
    expect(army.units.size).toBe(7);
  });

  test("kill the units of an army that reaches the threshold, not its mage", () => {
    const bench = crossBench();
    const cross = bench.world.addCross(100, 100, 600);
    const big = bench.addArmy(100, 100, "Big");
    const small = bench.addArmy(80, 80, "Small");
    fill(bench, big, 10, 102, 100);
    const outside = fill(bench, big, 2, 120, 120);
    fill(bench, small, 3, 98, 100);
    bench.step();
    expect([...big.units]).toEqual(outside);
    expect(big.corpses.size).toBe(10);
    expect([...big.corpses].every((corpse) => corpse.sacred)).toBe(true);
    expect(big.alive).toBe(true);
    expect(small.units.size).toBe(3);
    expect(cross.readyAt).toBeCloseTo(bench.world.time + 5, 1);
  });

  test("do nothing while recharging", () => {
    const bench = crossBench();
    const cross = bench.world.addCross(100, 100, 600);
    const army = bench.addArmy(100, 100);
    fill(bench, army, 10, 102, 100);
    bench.step();
    fill(bench, army, 10, 102, 100);
    bench.step(bench.config.network.tickRate * 2);
    expect(army.units.size).toBe(10);
    bench.step(bench.config.network.tickRate * 4);
    expect(army.units.size).toBe(0);
    expect(cross.readyAt).toBeGreaterThan(bench.world.time);
  });

  test("units killed by a cross rise later for their owner", () => {
    const bench = crossBench();
    bench.world.addCross(100, 100, 600);
    const army = bench.addArmy(130, 130);
    fill(bench, army, 10, 102, 100);
    bench.step();
    expect(army.corpses.size).toBe(10);
    bench.step(bench.config.network.tickRate * 4);
    expect(army.corpses.size).toBe(10);
    bench.step(bench.config.network.tickRate * 5);
    expect(army.corpses.size).toBe(0);
    expect(army.units.size).toBe(10);
  });

  test("move after their lifetime but never while recharging", () => {
    const bench = crossBench();
    bench.config.world.crosses.count = 1;
    const cross = bench.world.addCross(100, 100, 1);
    cross.readyAt = bench.world.time + 3;
    bench.step(bench.config.network.tickRate * 2);
    expect(bench.world.crosses.has(cross)).toBe(true);
    bench.step(bench.config.network.tickRate * 2);
    expect(bench.world.crosses.has(cross)).toBe(false);
    expect(bench.world.crosses.size).toBe(1);
  });
});
