import { describe, expect, test } from "vitest";
import { detour, runBots } from "../../src/lobby/bots.js";
import { createMassGrave } from "../../src/systems/points.js";
import { armyStrength } from "../../src/systems/strength.js";
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
    createMassGrave(bench.world, 90, 100, [
      { type: "zombie", item: undefined },
    ]);
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
    expect(armyStrength(bench.world, army)).toBeGreaterThan(5);
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

describe("bots with equipment and crosses", () => {
  test("loot a car to get an item", () => {
    const bench = createBench((config) => {
      Object.assign(config.world.pointsOfInterest["car"] ?? {}, {
        searchSec: 1,
        radius: 3,
      });
    });
    const army = botArmy(bench);
    bench.world.addUnit(army, "zombie", 100, 100);
    bench.world.addPointOfInterest("car", 115, 100, 600);
    runBots(bench.world);
    expect(army.mage.targetX).toBeCloseTo(115);
    bench.step(bench.config.network.tickRate * 5);
    const [unit] = army.units;
    const items = [
      ...army.inventory,
      ...(unit?.item === undefined ? [] : [unit.item]),
    ];
    expect(items).toHaveLength(1);
  });

  test("evolve their zombies when they can", () => {
    const bench = createBench();
    const army = botArmy(bench);
    for (let index = 0; index < 6; index++) {
      bench.world.addUnit(army, "zombie", 101, 100);
    }
    runBots(bench.world);
    const types = [...army.units].map((unit) => unit.type).sort();
    expect(types).toEqual(["big-zombie", "zombie"]);
  });

  const crossBench = () =>
    createBench((config) => {
      Object.assign(config.world.crosses, { radius: 6, threshold: 5 });
      config.lobby.bots.crossMargin = 2;
    });

  test("go around a cross that would strike their army", () => {
    const bench = crossBench();
    const army = botArmy(bench);
    for (let index = 0; index < 5; index++) {
      bench.world.addUnit(army, "zombie", 100, 100);
    }
    const cross = bench.world.addCross(120, 101, 600);
    const point = detour(bench.world, army, 140, 100);
    expect(Math.hypot(point.x - cross.x, point.y - cross.y)).toBeCloseTo(8);
    expect(point.y).toBeLessThan(cross.y);
  });

  test("walk through a cross when their army is too small or it is recharging", () => {
    const bench = crossBench();
    const army = botArmy(bench);
    for (let index = 0; index < 4; index++) {
      bench.world.addUnit(army, "zombie", 100, 100);
    }
    const cross = bench.world.addCross(120, 100, 600);
    expect(detour(bench.world, army, 140, 100)).toEqual({ x: 140, y: 100 });
    bench.world.addUnit(army, "zombie", 100, 100);
    cross.readyAt = bench.world.time + 10;
    expect(detour(bench.world, army, 140, 100)).toEqual({ x: 140, y: 100 });
  });
});

describe("bots in the V1 world", () => {
  test("spread out in the explore formation when nothing is around", () => {
    const bench = createBench();
    const army = botArmy(bench);
    runBots(bench.world);
    expect(army.formationChange?.to).toBe(
      bench.config.lobby.bots.formations.explore,
    );
  });

  test("attack a camp they can beat in the attack formation", () => {
    const bench = createBench();
    const army = botArmy(bench);
    for (let index = 0; index < 10; index++) {
      bench.world.addUnit(army, "big-zombie", 100, 101);
    }
    const camp = bench.world.addCamp(140, 100, 600);
    bench.world.addCampNpc(camp, "soldier", 140, 100);
    runBots(bench.world);
    expect(army.mage.targetX).toBeCloseTo(140);
    expect(army.formationChange?.to).toBe(
      bench.config.lobby.bots.formations.attack,
    );
  });

  test("leave a camp too strong for them", () => {
    const bench = createBench();
    const army = botArmy(bench);
    bench.world.addUnit(army, "zombie", 100, 101);
    const camp = bench.world.addCamp(140, 100, 600);
    for (let index = 0; index < 4; index++) {
      bench.world.addCampNpc(camp, "soldier", 140, 100);
    }
    runBots(bench.world);
    expect(army.mage.targetX).not.toBeCloseTo(140);
  });

  test("hunt the bounty from far away", () => {
    const bench = createBench();
    const army = botArmy(bench);
    for (let index = 0; index < 6; index++) {
      bench.world.addUnit(army, "zombie", 100, 101);
    }
    const leader = bench.addArmy(200, 100, "Leader");
    for (let index = 0; index < 7; index++) {
      bench.world.addUnit(leader, "zombie", 200, 101);
    }
    bench.config.lobby.bots.bountyRatio = 2;
    runBots(bench.world);
    expect(army.mage.targetX).toBeCloseTo(200);
  });

  test("hold in the defend formation against a slightly stronger army", () => {
    const bench = createBench();
    const army = botArmy(bench);
    for (const y of [99, 100, 101, 102]) {
      bench.world.addUnit(army, "zombie", 103, y);
    }
    const enemy = bench.addArmy(114, 100, "Enemy");
    for (const y of [98, 99, 100, 101, 102]) {
      bench.world.addUnit(enemy, "zombie", 107, y);
    }
    bench.step();
    if (army.bot !== undefined) {
      army.bot.thinkAt = 0;
    }
    runBots(bench.world);
    expect(army.retreat).toBeUndefined();
    expect(army.formationChange?.to).toBe(
      bench.config.lobby.bots.formations.defend,
    );
  });
});
