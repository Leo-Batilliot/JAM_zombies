import { describe, expect, test } from "vitest";
import { EntityKind } from "@horde/shared";
import { familyBonus } from "../../src/systems/combat.js";
import { damage, kill } from "../../src/systems/death.js";
import { equipInventory } from "../../src/systems/equipment.js";
import { evolve } from "../../src/systems/evolution.js";
import { killMage } from "../../src/systems/mage.js";
import { maintainCamps } from "../../src/systems/camps.js";
import { maintainMists } from "../../src/systems/mists.js";
import { corpseDelay } from "../../src/systems/reanimation.js";
import type { Army } from "../../src/world/world.js";
import { createBench } from "../support/bench.js";

const aim = (army: Army, targetId: number): void => {
  for (const unit of army.units) {
    unit.targetId = targetId;
    unit.retargetAt = Infinity;
  }
};

describe("projectiles", () => {
  test("a ranged unit shoots a projectile that hits its target", () => {
    const { world, config, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    world.addUnit(army, "skeleton-archer", 100, 100);
    const boss = world.addEventNpc("evil-pumpkin", 106, 100, "test");
    const hp = boss.hp;
    aim(army, boss.id);
    step();
    expect(world.projectiles.size).toBe(1);
    expect(boss.hp).toBe(hp);
    step(config.network.tickRate);
    expect(boss.hp).toBeLessThan(hp);
  });

  test("a projectile vanishes when its target is gone", () => {
    const { world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    world.addUnit(army, "skeleton-archer", 100, 100);
    const boss = world.addEventNpc("evil-pumpkin", 106, 100, "test");
    aim(army, boss.id);
    step();
    world.removeEntity(boss);
    step();
    expect(world.projectiles.size).toBe(0);
  });

  const crossShot = (fromInside: boolean, ready: boolean) => {
    const bench = createBench();
    const { world, addArmy } = bench;
    const cross = world.addCross(110, 100, 600);
    if (!ready) {
      cross.readyAt = Infinity;
    }
    const target = addArmy(200, 200, "Target");
    const victim = world.addUnit(target, "zombie", 140, 100);
    world.addProjectile(
      "arrow",
      { x: fromInside ? 109 : 100, y: 100 },
      victim.id,
      1,
      undefined,
      "test",
    );
    bench.step(8);
    return world;
  };

  test("a projectile burns when it enters an active cross", () => {
    expect(crossShot(false, true).projectiles.size).toBe(0);
  });

  test("a projectile crosses a recharging cross", () => {
    expect(crossShot(false, false).projectiles.size).toBe(1);
  });

  test("a projectile shot from inside the cross does not burn", () => {
    expect(crossShot(true, true).projectiles.size).toBe(1);
  });

  test("hunters shoot at the units around them", () => {
    const { world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    world.addUnit(army, "zombie", 100, 100);
    const camp = world.addCamp(106, 100, 600);
    world.addCampNpc(camp, "hunter", 106, 100);
    step();
    expect(
      [...world.projectiles].some((projectile) => projectile.type === "bullet"),
    ).toBe(true);
  });
});

describe("skeleton lineage", () => {
  test("killed hunters and soldiers leave skeleton archer corpses", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const camp = world.addCamp(110, 100, 600);
    kill(world, world.addCampNpc(camp, "hunter", 110, 100), army);
    kill(world, world.addCampNpc(camp, "soldier", 111, 100), army);
    expect([...army.corpses].map((corpse) => corpse.type)).toEqual([
      "skeleton-archer",
      "skeleton-archer",
    ]);
  });

  test("damage follows the triangle of strength", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    const zombie = world.addUnit(army, "zombie", 100, 100);
    const skeleton = world.addUnit(army, "skeleton-archer", 101, 100);
    expect(familyBonus(world, "skeleton-archer", zombie)).toBe(
      config.units.units["skeleton-archer"]?.bonus["zombie"],
    );
    expect(familyBonus(world, "zombie", skeleton)).toBe(1);
    expect(familyBonus(world, "skeleton-archer", army.mage)).toBe(1);
  });

  test("ten zombies evolve into a flesh golem", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    for (let index = 0; index < 11; index++) {
      world.addUnit(army, "zombie", 101, 100);
    }
    expect(evolve(world, army, "flesh-golem")).toBe(true);
    expect([...army.units].map((unit) => unit.type).sort()).toEqual([
      "flesh-golem",
      "zombie",
    ]);
  });

  test("ten skeleton archers evolve into a bone ballista", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    for (let index = 0; index < 10; index++) {
      world.addUnit(army, "skeleton-archer", 101, 100);
    }
    expect(evolve(world, army, "bone-ballista")).toBe(true);
    expect([...army.units].map((unit) => unit.type)).toEqual(["bone-ballista"]);
  });
});

describe("helmets", () => {
  test("a helmet raises the hp of a skeleton and reduces its damage", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    const skeleton = world.addUnit(army, "skeleton-archer", 101, 100);
    const base = skeleton.hp;
    army.inventory.push("iron-helmet");
    equipInventory(world, army);
    const helmet = config.equipment.items["iron-helmet"];
    expect(skeleton.item).toBe("iron-helmet");
    expect(skeleton.hp).toBeCloseTo(base * (helmet?.hp ?? 1));
    const before = skeleton.hp;
    damage(world, skeleton, 10, undefined);
    expect(before - skeleton.hp).toBeCloseTo(10 * (1 - (helmet?.armor ?? 0)));
  });

  test("zombies cannot wear helmets", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const zombie = world.addUnit(army, "zombie", 101, 100);
    army.inventory.push("leather-helmet");
    equipInventory(world, army);
    expect(zombie.item).toBeUndefined();
    expect(army.inventory).toEqual(["leather-helmet"]);
  });

  test("a unit raised with a helmet keeps its bonus hp", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    const unit = world.addUnit(
      army,
      "skeleton-archer",
      100,
      100,
      "cursed-helm",
    );
    expect(unit.hp).toBeCloseTo(
      (config.units.units["skeleton-archer"]?.hp ?? 0) *
        (config.equipment.items["cursed-helm"]?.hp ?? 1),
    );
  });
});

describe("graveyards", () => {
  test("searching a graveyard raises skeleton archers once per army", () => {
    const { world, config, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    world.addPointOfInterest("graveyard", 101, 100, 600);
    const searchSec =
      config.world.pointsOfInterest["graveyard"]?.searchSec ?? 0;
    step(Math.ceil(searchSec * config.network.tickRate) + 2);
    const raised = [...army.units].filter(
      (unit) => unit.type === "skeleton-archer",
    );
    const units = config.world.pointsOfInterest["graveyard"]?.units;
    expect(raised.length).toBeGreaterThanOrEqual(units?.min ?? 0);
    expect(raised.length).toBeLessThanOrEqual(units?.max ?? 0);
    expect(world.points.size).toBe(1);
    step(Math.ceil(searchSec * config.network.tickRate) + 2);
    expect(
      [...army.units].filter((unit) => unit.type === "skeleton-archer"),
    ).toHaveLength(raised.length);
  });
});

describe("armed camps", () => {
  test("camps are spawned with their defenders", () => {
    const { world, config } = createBench((config) => {
      config.world.camps.count = 2;
    });
    maintainCamps(world);
    const expected = config.world.camps.defenders.reduce(
      (sum, entry) => sum + entry.count,
      0,
    );
    expect(world.camps.size).toBe(2);
    for (const camp of world.camps) {
      expect(camp.defenders.size).toBe(expected);
    }
  });

  test("a destroyed camp leaves a chest anyone can search", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    const camp = world.addCamp(120, 100, 600);
    const defender = world.addCampNpc(camp, "soldier", 120, 100);
    kill(world, defender, army);
    maintainCamps(world);
    expect(world.camps.size).toBe(0);
    const [chest] = world.points;
    expect(chest?.type).toBe(config.world.camps.chest);
    expect(chest?.x).toBe(120);
  });

  test("an expired camp leaves once its defenders are quiet", () => {
    const { world } = createBench();
    const camp = world.addCamp(120, 100, 1);
    const defender = world.addCampNpc(camp, "soldier", 120, 100);
    world.time = 2;
    defender.targetId = 999;
    maintainCamps(world);
    expect(world.camps.size).toBe(1);
    defender.targetId = undefined;
    maintainCamps(world);
    expect(world.camps.size).toBe(0);
    expect(world.entities.has(defender.id)).toBe(false);
  });

  test("fighting a camp starts a battle against the whole camp", () => {
    const { world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    world.addUnit(army, "zombie", 101, 100);
    const camp = world.addCamp(105, 100, 600);
    world.addCampNpc(camp, "soldier", 105, 100);
    world.addCampNpc(camp, "soldier", 106, 101);
    step();
    expect(army.battle?.foes[0]?.bodies).toHaveLength(2);
  });
});

describe("mists", () => {
  test("mists are kept on the map and drift inside it", () => {
    const { world, config, step } = createBench((config) => {
      for (const mist of Object.values(config.world.mists)) {
        mist.count = 1;
        mist.speed = 50;
      }
    });
    maintainMists(world);
    expect(world.mists.size).toBe(Object.keys(config.world.mists).length);
    step(config.network.tickRate * 10);
    for (const mist of world.mists) {
      expect(mist.x).toBeGreaterThanOrEqual(0);
      expect(mist.x).toBeLessThanOrEqual(config.world.width);
    }
  });

  test("the purifying mist hurts units and the mage, not civilians", () => {
    const { world, config, addArmy, addCivilians, step } = createBench();
    const army = addArmy(100, 100);
    const unit = world.addUnit(army, "zombie", 110, 100);
    const civilian = [...addCivilians(120, 120, 1).members][0];
    world.addMist("purifying", 110, 105, 600).dirX = 0;
    const hp = unit.hp;
    step(config.network.tickRate);
    expect(unit.hp).toBeLessThan(hp);
    expect(army.mage.hp).toBeLessThan(config.gameplay.mage.baseHp);
    expect(civilian?.hp).toBe(config.units.npcs["civilian"]?.hp);
  });

  test("corpses rise faster in the necrotic mist", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    const inside = world.addCorpse("zombie", army, undefined, 300, 300);
    const outside = world.addCorpse("zombie", army, undefined, 50, 50);
    world.addMist("necrotic", 300, 300, 600);
    expect(corpseDelay(world, inside)).toBe(
      config.world.mists["necrotic"]?.reanimationDelaySec,
    );
    expect(corpseDelay(world, outside)).toBe(
      config.gameplay.reanimation.delaySec,
    );
  });
});

describe("bounty", () => {
  test("killing the leader gives the bounty to the killer", () => {
    const { world, config, addArmy } = createBench();
    const leader = addArmy(100, 100, "Leader");
    world.addUnit(leader, "big-zombie", 100, 100);
    const hunter = addArmy(150, 100, "Hunter");
    const other = addArmy(200, 100, "Other");
    world.addUnit(other, "zombie", 200, 100);
    killMage(world, leader, hunter);
    expect(hunter.souls).toBeGreaterThanOrEqual(config.events.bounty.souls);
    const before = hunter.souls;
    killMage(world, other, hunter);
    expect(hunter.souls).toBe(before);
  });

  test("an army without strength is no bounty", () => {
    const { world, addArmy } = createBench();
    const leader = addArmy(100, 100, "Leader");
    const hunter = addArmy(150, 100, "Hunter");
    killMage(world, leader, hunter);
    expect(hunter.souls).toBe(0);
  });
});

describe("new kinds in the world", () => {
  test("projectiles, mists and camps are regular entities", () => {
    const { world } = createBench();
    const camp = world.addCamp(10, 10, 60);
    const mist = world.addMist("necrotic", 20, 20, 60);
    expect(world.entities.get(camp.id)?.kind).toBe(EntityKind.Camp);
    expect(world.entities.get(mist.id)?.kind).toBe(EntityKind.Mist);
    world.removeEntity(camp);
    world.removeEntity(mist);
    expect(world.camps.size + world.mists.size).toBe(0);
  });
});
