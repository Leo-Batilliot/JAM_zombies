import { describe, expect, test } from "vitest";
import { damage } from "../../src/systems/death.js";
import { respawnMage } from "../../src/systems/mage.js";
import { maxHp } from "../../src/systems/souls.js";
import { createBench } from "../support/bench.js";

describe("mage death", () => {
  test("units target an enemy mage", () => {
    const { world, addArmy, step } = createBench();
    const unit = world.addUnit(addArmy(100, 100), "zombie", 100, 100);
    const enemy = addArmy(103, 100);
    step();
    expect(unit.targetId).toBe(enemy.mage.id);
  });

  test("the army disappears and the killer is remembered", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const killer = addArmy(120, 100, "Evil Ash");
    world.addUnit(army, "zombie", 101, 100);
    world.addCorpse("zombie", army, killer, 102, 100);
    damage(world, army.mage, army.mage.hp, killer);
    expect(army.alive).toBe(false);
    expect(army.units.size).toBe(0);
    expect(army.corpses.size).toBe(0);
    expect(world.entities.has(army.mage.id)).toBe(false);
    expect(army.killerName).toBe("Evil Ash");
    expect(army.deaths).toBe(1);
  });

  test("souls and level are reset", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    army.souls = 500;
    army.level = 6;
    damage(world, army.mage, 10000, undefined);
    expect(army.souls).toBe(0);
    expect(army.level).toBe(1);
  });

  test("the mage respawns after the delay with its starting army", () => {
    const { config, world, addArmy, step } = createBench((config) => {
      config.gameplay.respawn.delaySec = 1;
    });
    const army = addArmy(100, 100);
    damage(world, army.mage, 10000, undefined);
    step(config.network.tickRate / 2);
    expect(army.alive).toBe(false);
    step(config.network.tickRate);
    expect(army.alive).toBe(true);
    expect(world.entities.get(army.mage.id)).toBe(army.mage);
    expect(army.mage.hp).toBe(maxHp(world, army));
    expect(army.units.size).toBe(
      config.gameplay.army.startingUnits.reduce((sum, e) => sum + e.count, 0),
    );
  });

  test("the mage respawns away from big armies", () => {
    const { config, world, addArmy } = createBench((config) => {
      config.gameplay.respawn.bigArmyStrength = 3;
      config.gameplay.respawn.safeDistance = 150;
      config.world.spawnAttempts = 100;
    });
    const big = addArmy(200, 200, "Big");
    for (let index = 0; index < 5; index++) {
      world.addUnit(big, "zombie", 200, 200);
    }
    const army = addArmy(10, 10);
    damage(world, army.mage, 10000, undefined);
    respawnMage(world, army);
    expect(
      Math.hypot(army.mage.x - big.mage.x, army.mage.y - big.mage.y),
    ).toBeGreaterThan(config.gameplay.respawn.safeDistance);
  });
});

describe("mage regeneration", () => {
  test("hp comes back only after the delay without damage", () => {
    const { config, world, addArmy, step } = createBench((config) => {
      config.gameplay.mage.regenDelaySec = 2;
      config.gameplay.mage.regenPerSec = 10;
    });
    const army = addArmy(100, 100);
    damage(world, army.mage, 50, undefined);
    const hurt = army.mage.hp;
    step(config.network.tickRate);
    expect(army.mage.hp).toBe(hurt);
    step(config.network.tickRate * 2);
    expect(army.mage.hp).toBeGreaterThan(hurt);
    step(config.network.tickRate * 100);
    expect(army.mage.hp).toBe(maxHp(world, army));
  });
});
