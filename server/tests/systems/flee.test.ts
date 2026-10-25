import { describe, expect, test } from "vitest";
import type { Config } from "@horde/shared";
import { kill } from "../../src/systems/death.js";
import { orderMove } from "../../src/systems/orders.js";
import type { Army, Unit, World } from "../../src/world/world.js";
import { createBench } from "../support/bench.js";

const sturdy = (config: Config): void => {
  for (const type of ["zombie", "skeleton-archer"]) {
    const unit = config.units.units[type];
    if (unit !== undefined) {
      unit.hp = 100000;
    }
  }
};

const addGroup = (world: World, army: Army, units: Unit[]) => {
  const group = {
    army,
    units: new Set(units),
    corpses: new Set<never>(),
    anchorX: units[0]?.x ?? 0,
    anchorY: units[0]?.y ?? 0,
    engagedAt: world.time,
  };
  for (const unit of units) {
    unit.group = group;
  }
  army.groups.add(group);
  return group;
};

const contactBattle = (patch: (config: Config) => void = () => undefined) => {
  const bench = createBench((config) => {
    sturdy(config);
    patch(config);
  });
  const { world, addArmy, step } = bench;
  const army = addArmy(100, 100);
  const enemy = addArmy(125, 100, "Enemy");
  const contact = world.addUnit(army, "zombie", 110.9, 100);
  world.addUnit(enemy, "zombie", 112, 100);
  const others: Unit[] = [];
  for (let index = 0; index < 6; index++) {
    others.push(world.addUnit(army, "zombie", 97 + (index % 3), 99 + index));
  }
  step();
  return { ...bench, army, enemy, contact, others };
};

const runAway = (bench: ReturnType<typeof contactBattle>, seconds: number) => {
  orderMove(bench.world, bench.army, 20, 100);
  bench.step(bench.config.network.tickRate * seconds);
};

describe("free flee", () => {
  test("a mage that stays in the battle does not flee", () => {
    const bench = contactBattle();
    bench.step(bench.config.network.tickRate * 3);
    expect(bench.army.battle).toBeDefined();
    expect(bench.contact.group).toBeUndefined();
  });

  test("units in melee stay behind, the others follow the mage", () => {
    const bench = contactBattle();
    expect(bench.contact.fighting).toBe(true);
    runAway(bench, 4);
    expect(bench.contact.group).toBeDefined();
    expect(bench.contact.x).toBeGreaterThan(105);
    expect(bench.others.every((unit) => unit.group === undefined)).toBe(true);
    expect(Math.max(...bench.others.map((unit) => unit.x))).toBeLessThan(90);
  });

  test("ranged units in contact follow the mage", () => {
    const bench = contactBattle();
    const archer = bench.world.addUnit(bench.army, "skeleton-archer", 110, 101);
    bench.step();
    runAway(bench, 4);
    expect(archer.group).toBeUndefined();
  });

  test("corpses killed in this battle pass to their killer", () => {
    const bench = contactBattle();
    const other = bench.addArmy(300, 300, "Other");
    const lost = bench.world.addCorpse(
      "zombie",
      bench.army,
      bench.enemy,
      99,
      100,
    );
    const kept = bench.world.addCorpse("zombie", bench.army, other, 98, 100);
    runAway(bench, 4);
    expect(lost.owner).toBe(bench.enemy);
    expect(kept.owner).toBe(bench.army);
  });
});

describe("abandoned units", () => {
  test("a dead abandoned unit leaves a corpse that waits for the outcome", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      config.gameplay.battle.endDelaySec = 100;
      config.gameplay.reanimation.delaySec = 0.5;
    });
    const army = addArmy(100, 100);
    const enemy = addArmy(200, 200, "Enemy");
    const victim = world.addUnit(army, "zombie", 140, 100);
    const group = addGroup(world, army, [
      victim,
      world.addUnit(army, "zombie", 141, 100),
    ]);
    kill(world, victim, enemy);
    const [corpse] = [...army.corpses];
    expect(corpse?.group).toBe(group);
    step(config.network.tickRate * 2);
    expect(corpse?.owner).toBe(army);
  });

  test("a destroyed group hands its corpses to their killers", () => {
    const { world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    const enemy = addArmy(200, 200, "Enemy");
    const victim = world.addUnit(army, "zombie", 140, 100);
    addGroup(world, army, [victim]);
    kill(world, victim, enemy);
    step();
    expect(army.groups.size).toBe(0);
    expect(enemy.corpses.size).toBe(1);
  });

  test("a group that wins comes back to its mage faster", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      config.gameplay.battle.endDelaySec = 0.5;
    });
    const army = addArmy(100, 100);
    const survivor = world.addUnit(army, "zombie", 140, 100);
    addGroup(world, army, [survivor]);
    step(config.network.tickRate);
    expect(survivor.group).toBeUndefined();
    expect(survivor.returning).toBe(true);
    const before = survivor.x;
    step();
    const { speed } = config.units.units["zombie"] ?? { speed: 0 };
    expect(before - survivor.x).toBeGreaterThan(
      speed / config.network.tickRate,
    );
    step(config.network.tickRate * 5);
    expect(survivor.returning).toBe(false);
  });

  test("abandoned units hold their position instead of following", () => {
    const { world, addArmy, step } = createBench((config) => {
      config.gameplay.battle.endDelaySec = 100;
    });
    const army = addArmy(100, 100);
    const unit = world.addUnit(army, "zombie", 140, 100);
    addGroup(world, army, [unit]);
    step(5);
    expect(unit.x).toBe(140);
  });
});

describe("march", () => {
  test("a unit far from its place walks at the march speed", () => {
    const { world, config, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    const far = world.addUnit(army, "zombie", 140, 100);
    step();
    expect(far.returning).toBe(false);
    expect(140 - far.x).toBeLessThanOrEqual(
      config.gameplay.mage.speed / config.network.tickRate + 1e-9,
    );
  });
});
