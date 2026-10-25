import { describe, expect, test } from "vitest";
import { detour, runBots } from "../../src/lobby/bots.js";
import { createMassGrave } from "../../src/systems/points.js";
import { armyStrength } from "../../src/systems/strength.js";
import { createBench } from "../support/bench.js";

const botArmy = (bench: ReturnType<typeof createBench>, x = 100, y = 100) => {
  const army = bench.addArmy(x, y, "Bot");
  army.bot = {
    thinkAt: 0,
    handicap: 1,
    lastX: Number.NaN,
    lastY: Number.NaN,
    chase: undefined,
    ignored: new Map(),
  };
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
    army.formationReadyAt = 0;
    runBots(bench.world);
  };

  test("flee a stronger army by walking away from it", () => {
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
    expect(army.battle).toBeDefined();
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
    expect(army.formation).toBe(bench.config.lobby.bots.formations.attack);
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

  test("pick the mutation of their strongest lineage", () => {
    const bench = createBench();
    const army = botArmy(bench);
    for (let index = 0; index < 6; index++) {
      bench.world.addUnit(army, "skeleton-archer", 101, 100);
    }
    army.pendingLevels = 1;
    army.cards = [
      { kind: "gift", gift: "haste" },
      { kind: "mutation", unit: "ghoul" },
      { kind: "mutation", unit: "pyromancer" },
    ];
    runBots(bench.world);
    expect(army.mutations.get("skeleton")?.branch).toBe("sorcery");
    expect(army.mutations.has("zombie")).toBe(false);
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
    expect(army.formation).toBe(bench.config.lobby.bots.formations.explore);
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
    expect(army.formation).toBe(bench.config.lobby.bots.formations.attack);
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
    army.formationReadyAt = 0;
    runBots(bench.world);
    expect(army.formation).toBe(bench.config.lobby.bots.formations.defend);
  });
});

describe("bots choosing cards", () => {
  test("mutate the lineage with the most units waiting to fuse", () => {
    const bench = createBench();
    const army = botArmy(bench);
    for (let index = 0; index < 3; index++) {
      bench.world.addUnit(army, "zombie", 101, 100);
    }
    for (let index = 0; index < 10; index++) {
      bench.world.addUnit(army, "skeleton-archer", 99, 100);
    }
    army.cards = [
      { kind: "mutation", unit: "big-zombie" },
      { kind: "gift", gift: "haste" },
      { kind: "mutation", unit: "skeleton-crossbowman" },
    ];
    army.pendingLevels = 1;
    runBots(bench.world);
    expect(army.mutations.get("skeleton")?.tier).toBe(1);
    expect(army.mutations.has("zombie")).toBe(false);
  });

  test("take a gift when no mutation helps their army", () => {
    const bench = createBench();
    const army = botArmy(bench);
    bench.world.addUnit(army, "zombie", 101, 100);
    army.cards = [
      { kind: "mutation", unit: "skeleton-crossbowman" },
      { kind: "gift", gift: "haste" },
    ];
    army.pendingLevels = 1;
    runBots(bench.world);
    expect(army.gifts.get("haste")).toBe(1);
    expect(army.mutations.size).toBe(0);
  });
});

describe("bots and champions", () => {
  test("go after a far champion lair once strong enough", () => {
    const bench = createBench();
    const army = botArmy(bench, 100, 100);
    for (let index = 0; index < 40; index++) {
      bench.world.addUnit(army, "zombie", 101, 100);
    }
    const lair = bench.world.addCamp(200, 100, Infinity, 1);
    bench.world.addCampNpc(lair, "executioner", 200, 100);
    runBots(bench.world);
    expect(army.mage.targetX).toBeGreaterThan(150);
  });

  test("leave a far champion lair alone while weak", () => {
    const bench = createBench();
    const army = botArmy(bench, 100, 100);
    const lair = bench.world.addCamp(200, 100, Infinity, 1);
    bench.world.addCampNpc(lair, "executioner", 200, 100);
    runBots(bench.world);
    expect(army.mage.targetX).toBeLessThan(150);
  });
});
