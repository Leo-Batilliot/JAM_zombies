import { describe, expect, test } from "vitest";
import { runBots } from "../../src/lobby/bots.js";
import { createMassGrave } from "../../src/systems/points.js";
import { createBench } from "../support/bench.js";

const botArmy = (bench: ReturnType<typeof createBench>, x = 100, y = 100) => {
  const army = bench.addArmy(x, y, "Bot");
  army.bot = { thinkAt: 0 };
  return army;
};

describe("bots", () => {
  test("wander when nothing is around", () => {
    const bench = createBench();
    const army = botArmy(bench);
    runBots(bench.world);
    expect(
      Math.hypot(army.mage.targetX - 100, army.mage.targetY - 100),
    ).toBeGreaterThan(0);
  });

  test("hunt the closest civilian with an attack order", () => {
    const bench = createBench();
    const army = botArmy(bench);
    const civilian = [...bench.addCivilians(120, 100, 1).members][0];
    runBots(bench.world);
    expect(army.focusId).toBe(civilian?.id);
    expect(army.mage.targetX).toBeCloseTo(120);
  });

  test("loot a point of interest before hunting", () => {
    const bench = createBench();
    const army = botArmy(bench);
    bench.addCivilians(110, 100, 1);
    createMassGrave(bench.world, 90, 100, ["zombie"]);
    runBots(bench.world);
    expect(army.mage.targetX).toBeCloseTo(90);
    expect(army.focusId).toBeUndefined();
  });

  test("players are never driven by a bot", () => {
    const bench = createBench();
    const army = bench.addArmy(100, 100);
    bench.addCivilians(110, 100, 1);
    runBots(bench.world);
    expect(army.focusId).toBeUndefined();
    expect(army.mage.targetX).toBe(100);
  });

  test("a bot grows its army over time", () => {
    const bench = createBench((config) => {
      config.gameplay.reanimation.delaySec = 1;
    });
    const army = botArmy(bench);
    for (let index = 0; index < 5; index++) {
      bench.world.addUnit(army, "zombie", 100, 100);
    }
    bench.addCivilians(115, 100, 4);
    bench.step(bench.config.network.tickRate * 30);
    expect(army.units.size).toBeGreaterThan(5);
  });
});
