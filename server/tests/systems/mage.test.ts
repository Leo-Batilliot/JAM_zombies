import { describe, expect, test } from "vitest";
import { damage } from "../../src/systems/death.js";
import { killMage, respawnMage } from "../../src/systems/mage.js";
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

  test("the army is emptied and the killer is remembered", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const killer = addArmy(120, 100, "Evil Ash");
    world.addUnit(army, "zombie", 101, 100);
    world.addCorpse("zombie", army, killer, 102, 100);
    killMage(world, army, killer);
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
    killMage(world, army, undefined);
    expect(army.souls).toBe(0);
    expect(army.level).toBe(1);
  });

  test("the mage respawns after the delay with its starting army", () => {
    const { config, world, addArmy, step } = createBench((config) => {
      config.gameplay.respawn.delaySec = 1;
    });
    const army = addArmy(100, 100);
    killMage(world, army, undefined);
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
    killMage(world, army, undefined);
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

describe("soul link", () => {
  test("the nearest guard takes the configured share of the damage", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    const guard = world.addUnit(army, "zombie", 101, 100);
    world.addUnit(army, "zombie", 104, 100);
    const hp = guard.hp;
    damage(world, army.mage, 5, undefined);
    const { share } = config.gameplay.soulLink;
    expect(guard.hp).toBeCloseTo(hp - 5 * share);
    expect(army.mage.hp).toBeCloseTo(
      config.gameplay.mage.baseHp - 5 * (1 - share),
    );
  });

  test("without a guard in range the mage takes all the damage", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    const far = world.addUnit(army, "zombie", 120, 100);
    damage(world, army.mage, 5, undefined);
    expect(far.hp).toBe(config.units.units["zombie"]?.hp);
    expect(army.mage.hp).toBe(config.gameplay.mage.baseHp - 5);
  });

  test("the mage loses at most the capped share of its max hp per second", () => {
    const { world, config, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    const cap =
      config.gameplay.mage.baseHp * config.gameplay.soulLink.maxLossPerSec;
    damage(world, army.mage, 1000, undefined);
    expect(army.mage.hp).toBeCloseTo(config.gameplay.mage.baseHp - cap);
    damage(world, army.mage, 1000, undefined);
    expect(army.mage.hp).toBeCloseTo(config.gameplay.mage.baseHp - cap);
    step(config.network.tickRate);
    damage(world, army.mage, 1000, undefined);
    expect(army.mage.hp).toBeCloseTo(config.gameplay.mage.baseHp - 2 * cap, 0);
  });

  test("units prefer any other enemy to a mage", () => {
    const { world, addArmy, step } = createBench();
    const unit = world.addUnit(addArmy(100, 100), "zombie", 100, 100);
    const enemy = addArmy(102, 100, "Enemy");
    const foe = world.addUnit(enemy, "zombie", 105, 100);
    step();
    expect(unit.targetId).toBe(foe.id);
  });
});

describe("mage death hand-over", () => {
  const typesInGraves = (world: { points: Set<{ corpses: unknown[] }> }) =>
    [...world.points].flatMap((point) => point.corpses);

  test("the killer gets the configured share, the rest forms a mass grave", () => {
    const { world, addArmy } = createBench((config) => {
      config.gameplay.transfer.share = 0.7;
    });
    const army = addArmy(100, 100);
    const killer = addArmy(130, 100, "Killer");
    for (let index = 0; index < 10; index++) {
      world.addUnit(army, "zombie", 101, 100);
    }
    killMage(world, army, killer);
    expect(killer.units.size).toBe(7);
    expect([...killer.units].every((unit) => unit.army === killer)).toBe(true);
    expect(typesInGraves(world)).toHaveLength(3);
  });

  test("living units keep their hp when they change side", () => {
    const { world, addArmy } = createBench((config) => {
      config.gameplay.transfer.share = 1;
    });
    const army = addArmy(100, 100);
    const killer = addArmy(130, 100, "Killer");
    const unit = world.addUnit(army, "zombie", 101, 100);
    unit.hp = 7;
    killMage(world, army, killer);
    expect(unit.army).toBe(killer);
    expect(unit.hp).toBe(7);
    expect(world.entities.get(unit.id)).toBe(unit);
  });

  test("each pending corpse goes to its own killer", () => {
    const { world, addArmy } = createBench((config) => {
      config.gameplay.transfer.share = 1;
    });
    const army = addArmy(100, 100);
    const killer = addArmy(130, 100, "Killer");
    const other = addArmy(160, 100, "Other");
    const corpse = world.addCorpse("zombie", army, other, 102, 100);
    const npcCorpse = world.addCorpse("zombie", army, undefined, 103, 100);
    killMage(world, army, killer);
    expect(corpse.owner).toBe(other);
    expect(other.corpses.has(corpse)).toBe(true);
    expect(npcCorpse.owner).toBe(killer);
  });

  test("without an army killer everything falls into the mass grave", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    world.addUnit(army, "zombie", 101, 100);
    world.addUnit(army, "zombie", 102, 100);
    world.addCorpse("zombie", army, undefined, 103, 100);
    killMage(world, army, undefined);
    expect(typesInGraves(world)).toHaveLength(3);
  });
});
