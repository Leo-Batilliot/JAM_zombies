import { describe, expect, test } from "vitest";
import { EntityKind } from "@horde/shared";
import { orderAttack, orderMove } from "../../src/systems/orders.js";
import { createBench } from "../support/bench.js";

describe("targeting", () => {
  test("a unit targets the closest enemy in range", () => {
    const { world, addArmy, addCivilians, step } = createBench();
    const army = addArmy(100, 100);
    const unit = world.addUnit(army, "zombie", 100, 100);
    const far = addCivilians(105, 100, 1);
    const close = addCivilians(102, 100, 1);
    step();
    expect(unit.targetId).toBe([...close.members][0]?.id);
    expect(unit.targetId).not.toBe([...far.members][0]?.id);
  });

  test("a unit ignores its own army", () => {
    const { world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    const unit = world.addUnit(army, "zombie", 100, 100);
    world.addUnit(army, "zombie", 101, 100);
    step();
    expect(unit.targetId).toBeUndefined();
  });

  test("a unit targets units of another army", () => {
    const { world, addArmy, step } = createBench();
    const unit = world.addUnit(addArmy(100, 100), "zombie", 100, 100);
    const enemy = world.addUnit(addArmy(110, 100), "zombie", 103, 100);
    step();
    expect(unit.targetId).toBe(enemy.id);
  });

  test("a unit does not chase beyond the leash", () => {
    const { world, addArmy, addCivilians, step } = createBench((config) => {
      config.gameplay.combat.leashDistance = 5;
    });
    const unit = world.addUnit(addArmy(100, 100), "zombie", 103, 100);
    addCivilians(109, 100, 1);
    step();
    expect(unit.targetId).toBeUndefined();
  });
});

describe("attack order", () => {
  test("all units of the army attack the chosen enemy", () => {
    const { world, addArmy, addCivilians, step } = createBench();
    const army = addArmy(100, 100);
    const units = [0, 1, 2].map(() => world.addUnit(army, "zombie", 100, 100));
    addCivilians(102, 100, 1);
    const chosen = [...addCivilians(115, 100, 1).members][0];
    expect(orderAttack(world, army, chosen?.id ?? 0)).toBe(true);
    step();
    for (const unit of units) {
      expect(unit.targetId).toBe(chosen?.id);
    }
  });

  test("refuses an ally or an unknown entity", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const ally = world.addUnit(army, "zombie", 101, 100);
    expect(orderAttack(world, army, ally.id)).toBe(false);
    expect(orderAttack(world, army, 9999)).toBe(false);
    expect(army.focusId).toBeUndefined();
  });

  test("a move order cancels the attack order", () => {
    const { world, addArmy, addCivilians } = createBench();
    const army = addArmy(100, 100);
    const target = [...addCivilians(110, 100, 1).members][0];
    orderAttack(world, army, target?.id ?? 0);
    orderMove(world, army, 50, 50);
    expect(army.focusId).toBeUndefined();
  });
});

describe("attrition combat", () => {
  test("damage and attack rate come from the registry", () => {
    const { config, world, addArmy, step } = createBench((config) => {
      Object.assign(config.units.units["zombie"] ?? {}, {
        damage: 4,
        attackIntervalSec: 0.5,
        hp: 100,
      });
    });
    const unit = world.addUnit(addArmy(99, 100), "zombie", 100, 100);
    const enemy = world.addUnit(addArmy(102, 100), "zombie", 100.9, 100);
    step(config.network.tickRate);
    expect(unit.targetId).toBe(enemy.id);
    expect(enemy.hp).toBeLessThanOrEqual(100 - 4 * 2);
    expect(enemy.hp).toBeGreaterThanOrEqual(100 - 4 * 3);
  });

  test("units chase and kill a civilian", () => {
    const { config, world, addArmy, addCivilians, step } = createBench();
    const army = addArmy(100, 100);
    world.addUnit(army, "zombie", 100, 100);
    world.addUnit(army, "zombie", 100, 101);
    addCivilians(104, 100, 1);
    step(config.network.tickRate * 10);
    const npcs = [...world.entities.values()].filter(
      (entity) => entity.kind === EntityKind.Npc,
    );
    expect(npcs).toHaveLength(0);
  });
});
