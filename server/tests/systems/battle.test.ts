import { describe, expect, test } from "vitest";
import type { Config } from "@horde/shared";
import {
  aggroCircles,
  clampToCircles,
  freeSector,
} from "../../src/systems/battle.js";
import { startEvent } from "../../src/systems/events.js";
import { orderMove, orderRetreat } from "../../src/systems/orders.js";
import { createBench } from "../support/bench.js";

const sturdy = (config: Config): void => {
  const zombie = config.units.units["zombie"];
  if (zombie !== undefined) {
    zombie.hp = 100000;
  }
};

describe("battle detection", () => {
  test("an enemy unit within the engagement radius starts a battle", () => {
    const { world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    const enemy = addArmy(112, 100, "Enemy");
    const bystander = addArmy(300, 300, "Far");
    world.addUnit(army, "zombie", 103, 100);
    world.addUnit(enemy, "zombie", 108, 100);
    step();
    expect(army.battle?.foes.map((foe) => foe.army)).toEqual([enemy]);
    expect(enemy.battle?.foes.map((foe) => foe.army)).toEqual([army]);
    expect(bystander.battle).toBeUndefined();
  });

  test("units farther than the engagement radius do not start a battle", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      config.gameplay.battle.engageRadius = 3;
    });
    const army = addArmy(100, 100);
    const enemy = addArmy(115, 100, "Enemy");
    world.addUnit(army, "zombie", 103, 100);
    world.addUnit(enemy, "zombie", 110, 100);
    step();
    expect(config.units.units["zombie"]?.aggroRange).toBeGreaterThan(7);
    expect(army.battle).toBeUndefined();
  });

  test("the battle ends after the delay without contact", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      config.gameplay.battle.endDelaySec = 1;
    });
    const army = addArmy(100, 100);
    const enemy = addArmy(112, 100, "Enemy");
    world.addUnit(army, "zombie", 103, 100);
    const foe = world.addUnit(enemy, "zombie", 108, 100);
    step();
    expect(army.battle).toBeDefined();
    world.removeEntity(foe);
    step(config.network.tickRate / 2);
    expect(army.battle).toBeDefined();
    step(config.network.tickRate);
    expect(army.battle).toBeUndefined();
  });

  test("a hostile npc starts a battle", () => {
    const { world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    world.addUnit(army, "zombie", 101, 100);
    startEvent(world, "pumpkin", 105, 100);
    step();
    expect(army.battle).toBeDefined();
    expect(army.battle?.foes[0]?.army).toBeUndefined();
  });

  test("civilians do not start a battle", () => {
    const { world, addArmy, addCivilians, step } = createBench();
    const army = addArmy(100, 100);
    world.addUnit(army, "zombie", 101, 100);
    addCivilians(104, 100, 3);
    step();
    expect(army.battle).toBeUndefined();
  });
});

describe("aggro circle", () => {
  const circle = { x: 0, y: 0, radius: 10 };

  test("moves inside the circle are free", () => {
    expect(clampToCircles([circle], { x: 0, y: 0 }, { x: 5, y: 5 })).toEqual({
      x: 5,
      y: 5,
    });
  });

  test("a move outside stops at the edge", () => {
    const next = clampToCircles([circle], { x: 9, y: 0 }, { x: 12, y: 0 });
    expect(next.x).toBeCloseTo(10);
    expect(next.y).toBeCloseTo(0);
  });

  test("a mage already outside cannot get farther", () => {
    const next = clampToCircles([circle], { x: 14, y: 0 }, { x: 16, y: 0 });
    expect(Math.hypot(next.x, next.y)).toBeCloseTo(14);
    expect(clampToCircles([circle], { x: 14, y: 0 }, { x: 13, y: 0 })).toEqual({
      x: 13,
      y: 0,
    });
  });

  test("several circles form a union", () => {
    const other = { x: 25, y: 0, radius: 10 };
    expect(
      clampToCircles([circle, other], { x: 9, y: 0 }, { x: 20, y: 0 }),
    ).toEqual({ x: 20, y: 0 });
  });

  test("the mage stays inside the circle around the enemy army", () => {
    const { world, config, addArmy, step } = createBench(sturdy);
    const army = addArmy(100, 100);
    const enemy = addArmy(110, 100, "Enemy");
    world.addUnit(army, "zombie", 103, 100);
    world.addUnit(enemy, "zombie", 106, 100);
    step();
    orderMove(world, army, 0, 100);
    step(config.network.tickRate * 3);
    const circles = aggroCircles(world, army);
    expect(circles.length).toBe(1);
    expect(
      circles.some(
        (circle) =>
          Math.hypot(army.mage.x - circle.x, army.mage.y - circle.y) <=
          circle.radius + 0.01,
      ),
    ).toBe(true);
    expect(army.mage.x).toBeGreaterThan(80);
  });
});

describe("reanimation in battle", () => {
  test("corpses wait until the battle is over", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      sturdy(config);
      config.gameplay.reanimation.delaySec = 1;
      config.gameplay.battle.endDelaySec = 0.5;
    });
    const army = addArmy(100, 100);
    const enemy = addArmy(112, 100, "Enemy");
    world.addUnit(army, "zombie", 103, 100);
    const foe = world.addUnit(enemy, "zombie", 108, 100);
    const corpse = world.addCorpse("zombie", army, enemy, 99, 100);
    step(config.network.tickRate * 2);
    expect(army.battle).toBeDefined();
    expect(army.corpses.has(corpse)).toBe(true);
    world.removeEntity(foe);
    step(config.network.tickRate);
    expect(army.battle).toBeUndefined();
    expect(army.corpses.size).toBe(0);
    expect(army.units.size).toBe(2);
  });
});

describe("encirclement", () => {
  test("the free sector is the largest gap between threats", () => {
    const at = (angle: number) => ({ x: Math.cos(angle), y: Math.sin(angle) });
    const ring = [0, 1, 2, 3, 4, 5].map((index) =>
      at((index * Math.PI) / 3),
    ) as never[];
    expect(freeSector(0, 0, ring).size).toBeCloseTo(Math.PI / 3);
    const side = [at(-0.2), at(0), at(0.2)] as never[];
    const sector = freeSector(0, 0, side);
    expect(sector.size).toBeCloseTo(2 * Math.PI - 0.4);
    expect(Math.cos(sector.middle)).toBeCloseTo(-1);
    expect(freeSector(0, 0, []).size).toBeCloseTo(2 * Math.PI);
  });

  test("an army surrounded on all sides cannot retreat", () => {
    const { world, addArmy, step } = createBench((config) => {
      sturdy(config);
      config.gameplay.battle.freeSectorDeg = 60;
    });
    const army = addArmy(100, 100);
    const enemy = addArmy(100, 110, "Enemy");
    world.addUnit(army, "zombie", 100, 100);
    for (let index = 0; index < 8; index++) {
      const angle = (index / 8) * 2 * Math.PI;
      world.addUnit(
        enemy,
        "zombie",
        100 + Math.cos(angle) * 3,
        100 + Math.sin(angle) * 3,
      );
    }
    step();
    expect(army.battle?.encircled).toBe(true);
    expect(orderRetreat(world, army, 50, 100)).toBe(false);
    expect(army.retreat).toBeUndefined();
  });

  test("an army attacked from one side is not encircled", () => {
    const { world, addArmy, step } = createBench(sturdy);
    const army = addArmy(100, 100);
    const enemy = addArmy(112, 100, "Enemy");
    world.addUnit(army, "zombie", 100, 100);
    for (let index = 0; index < 4; index++) {
      world.addUnit(enemy, "zombie", 104, 98 + index);
    }
    step();
    expect(army.battle?.encircled).toBe(false);
    expect(Math.cos(army.battle?.escapeAngle ?? 0)).toBeLessThan(-0.5);
  });
});
