import { describe, expect, test } from "vitest";
import { createBench } from "../support/bench.js";

const raiders = (encircle = 0) => {
  const bench = createBench((config) => {
    config.world.populations = [
      {
        npc: "wolf",
        count: 0,
        groupSize: { min: 4, max: 4 },
        groupSpread: 3,
        wanderDistance: 20,
        wanderIntervalSec: 8,
        fleeRadius: 14,
        respawnIntervalSec: 10,
        safeDistance: 0,
        raid: { attackRatio: 1, fleeHpRatio: 0.4, encircle },
      },
    ];
  });
  const group = bench.world.addNpcGroup(0, 100, 100);
  const offsets = [
    [3, 0],
    [-3, 0],
    [0, 3],
    [0, -3],
  ];
  const wolves = offsets.map(([x = 0, y = 0]) =>
    bench.world.addNpc(group, "wolf", x, y),
  );
  return { ...bench, group, wolves };
};

describe("raiding populations", () => {
  test("hunt an army weaker than the pack", () => {
    const { world, addArmy, step, group, wolves } = raiders();
    const army = addArmy(108, 100);
    world.addUnit(army, "zombie", 107, 100);
    step(5);
    expect(group.fleeingSince).toBeUndefined();
    expect(wolves.some((wolf) => wolf.targetId !== undefined)).toBe(true);
  });

  test("flee an army stronger than the pack", () => {
    const { world, addArmy, step, group, wolves } = raiders();
    const army = addArmy(108, 100);
    for (let index = 0; index < 20; index++) {
      world.addUnit(army, "zombie", 107, 100 + index * 0.1);
    }
    step(5);
    expect(group.fleeingSince).toBeDefined();
    expect(wolves.every((wolf) => wolf.targetId === undefined)).toBe(true);
  });

  test("flee once the pack is badly hurt", () => {
    const { world, addArmy, step, group, wolves } = raiders();
    for (const wolf of wolves) {
      wolf.hp = 5;
    }
    const army = addArmy(108, 100);
    world.addUnit(army, "zombie", 107, 100);
    step(5);
    expect(group.fleeingSince).toBeDefined();
  });

  test("close in from every side when encircling", () => {
    const { world, addArmy, step, wolves } = raiders(4);
    const army = addArmy(100, 120);
    world.addUnit(army, "zombie", 100, 112);
    step(20);
    const sides = new Set(
      wolves.map((wolf) => Math.sign(Math.round(wolf.x - 100))),
    );
    expect(sides.size).toBeGreaterThan(1);
  });
});
