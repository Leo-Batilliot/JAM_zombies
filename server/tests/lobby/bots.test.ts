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

  test("do not hunt hostile npcs", () => {
    const bench = createBench();
    const army = botArmy(bench);
    bench.world.addEventNpc("jack-o-lantern", 105, 100, "pumpkin");
    const civilian = [...bench.addCivilians(130, 100, 1).members][0];
    runBots(bench.world);
    expect(army.focusId).toBe(civilian?.id);
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

describe("bots in battle", () => {
  const withUnits = (
    bench: ReturnType<typeof createBench>,
    army: ReturnType<ReturnType<typeof createBench>["addArmy"]>,
    places: [number, number][],
  ) => {
    for (const [x, y] of places) {
      bench.world.addUnit(army, "zombie", x, y);
    }
  };

  const think = (
    bench: ReturnType<typeof createBench>,
    army: ReturnType<typeof botArmy>,
  ) => {
    bench.step();
    if (army.bot !== undefined) {
      army.bot.thinkAt = 0;
    }
    runBots(bench.world);
  };

  test("flee a stronger army with a retreat away from it", () => {
    const bench = createBench();
    const army = botArmy(bench);
    withUnits(bench, army, [[103, 100]]);
    const enemy = bench.addArmy(114, 100, "Enemy");
    withUnits(bench, enemy, [
      [107, 99],
      [107, 100],
      [107, 101],
      [108, 99],
      [108, 100],
      [108, 101],
    ]);
    think(bench, army);
    expect(army.retreat).toBeDefined();
    expect(army.mage.targetX).toBeLessThan(100);
  });

  test("stand their ground against a weaker army", () => {
    const bench = createBench();
    const army = botArmy(bench);
    withUnits(bench, army, [
      [103, 99],
      [103, 100],
      [103, 101],
      [102, 99],
      [102, 100],
      [102, 101],
    ]);
    const enemy = bench.addArmy(114, 100, "Enemy");
    withUnits(bench, enemy, [[107, 100]]);
    think(bench, army);
    expect(army.battle).toBeDefined();
    expect(army.retreat).toBeUndefined();
  });

  test("flee before an equal army closes the circle", () => {
    const bench = createBench();
    const army = botArmy(bench);
    withUnits(bench, army, [
      [100, 101],
      [101, 100],
      [100, 99],
      [99, 100],
    ]);
    const enemy = bench.addArmy(100, 112, "Enemy");
    withUnits(bench, enemy, [
      [104, 100],
      [100, 104],
      [96, 100],
      [100, 96],
    ]);
    think(bench, army);
    expect(army.battle?.encircled).toBe(false);
    expect(army.retreat).toBeDefined();
  });

  test("attack a weaker army in range", () => {
    const bench = createBench();
    const army = botArmy(bench);
    withUnits(bench, army, [
      [100, 101],
      [101, 100],
      [100, 99],
    ]);
    const prey = bench.addArmy(130, 100, "Prey");
    runBots(bench.world);
    expect(army.mage.targetX).toBeCloseTo(prey.mage.x);
  });

  test("leave a stronger army alone", () => {
    const bench = createBench();
    const army = botArmy(bench);
    const strong = bench.addArmy(130, 100, "Strong");
    withUnits(bench, strong, [[130, 101]]);
    runBots(bench.world);
    expect(army.mage.targetX).not.toBeCloseTo(strong.mage.x);
  });
});
