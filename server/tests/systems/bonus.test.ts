import { describe, expect, test } from "vitest";
import { EntityKind } from "@horde/shared";
import { visibleEntities } from "../../src/net/interest.js";
import {
  crowdMultiplier,
  markZones,
  runBombings,
} from "../../src/systems/bombings.js";
import { familyBonus } from "../../src/systems/combat.js";
import { kill } from "../../src/systems/death.js";
import { damageBonus, equipInventory } from "../../src/systems/equipment.js";
import { evolve } from "../../src/systems/evolution.js";
import { followMages } from "../../src/systems/formation.js";
import { createBench } from "../support/bench.js";

describe("beast lineage", () => {
  test("killed guard dogs leave zombie dog corpses to their killer", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const camp = world.addCamp(110, 100, 600);
    kill(world, world.addCampNpc(camp, "guard-dog", 110, 100), army);
    expect([...army.corpses].map((corpse) => corpse.type)).toEqual([
      "zombie-dog",
    ]);
  });

  test("camps are defended by guard dogs", () => {
    const { config } = createBench();
    expect(
      config.world.camps.defenders.find((entry) => entry.npc === "guard-dog")
        ?.count,
    ).toBeGreaterThan(0);
  });

  test("the triangle of strength is complete", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    const zombie = world.addUnit(army, "zombie", 100, 100);
    const skeleton = world.addUnit(army, "skeleton-archer", 101, 100);
    const dog = world.addUnit(army, "zombie-dog", 102, 100);
    const units = config.units.units;
    expect(familyBonus(world, "zombie-dog", skeleton)).toBe(
      units["zombie-dog"]?.bonus["skeleton"],
    );
    expect(familyBonus(world, "big-zombie", dog)).toBe(
      units["big-zombie"]?.bonus["beast"],
    );
    expect(familyBonus(world, "skeleton-archer", zombie)).toBe(
      units["skeleton-archer"]?.bonus["zombie"],
    );
    expect(familyBonus(world, "zombie-dog", zombie)).toBe(1);
    expect(familyBonus(world, "skeleton-archer", dog)).toBe(1);
  });

  test.each([
    ["mastiff", 5],
    ["cerberus", 10],
  ])("zombie dogs evolve into a %s", (into, cost) => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    for (let index = 0; index < cost; index++) {
      world.addUnit(army, "zombie-dog", 101, 100);
    }
    expect(evolve(world, army, into)).toBe(true);
    expect([...army.units].map((unit) => unit.type)).toEqual([into]);
  });
});

describe("collars", () => {
  test("a collar equips a beast, never a zombie", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const zombie = world.addUnit(army, "zombie", 101, 100);
    const dog = world.addUnit(army, "zombie-dog", 102, 100);
    army.inventory.push("bone-collar");
    equipInventory(world, army);
    expect(zombie.item).toBeUndefined();
    expect(dog.item).toBe("bone-collar");
  });

  test("a collar makes its beast bite harder and run faster", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    const plain = world.addUnit(army, "zombie-dog", 140, 100);
    const chained = world.addUnit(
      army,
      "zombie-dog",
      140,
      101,
      "cerberus-chain",
    );
    const chain = config.equipment.items["cerberus-chain"];
    expect(damageBonus(world, chained)).toBe(chain?.damage);
    expect(damageBonus(world, plain)).toBe(1);
    const start = (unit: typeof plain) => ({ x: unit.x, y: unit.y });
    const from = [start(plain), start(chained)];
    followMages(world, 1 / config.network.tickRate);
    const moved = [plain, chained].map((unit, index) =>
      Math.hypot(
        unit.x - (from[index]?.x ?? 0),
        unit.y - (from[index]?.y ?? 0),
      ),
    );
    expect((moved[1] ?? 0) / (moved[0] ?? 1)).toBeCloseTo(chain?.speed ?? 1);
  });
});

describe("bombings", () => {
  test("a wave marks zones on the armies, struck after the delay", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      config.world.bombings.zones = 2;
      config.world.bombings.spread = 0;
    });
    const army = addArmy(100, 100);
    world.addUnit(army, "zombie", 101, 100);
    markZones(world);
    expect(world.bombings.size).toBe(2);
    for (const bombing of world.bombings) {
      expect(bombing.x).toBeCloseTo(100);
      expect(bombing.y).toBeCloseTo(100);
      expect(bombing.struck).toBe(false);
    }
    const { delaySec, blastSec } = config.world.bombings;
    step(Math.ceil(delaySec * config.network.tickRate) + 1);
    expect([...world.bombings].every((bombing) => bombing.struck)).toBe(true);
    step(Math.ceil(blastSec * config.network.tickRate) + 1);
    expect(world.bombings.size).toBe(0);
  });

  test("waves come back after the configured interval", () => {
    const { world, config } = createBench((config) => {
      config.world.bombings.zones = 1;
    });
    const { firstDelaySec, intervalSec } = config.world.bombings;
    world.time = firstDelaySec - 1;
    runBombings(world);
    expect(world.bombings.size).toBe(0);
    world.time = firstDelaySec;
    runBombings(world);
    expect(world.bombings.size).toBe(1);
    expect(world.bombingAt).toBeGreaterThanOrEqual(
      firstDelaySec + intervalSec.min,
    );
    expect(world.bombingAt).toBeLessThanOrEqual(
      firstDelaySec + intervalSec.max,
    );
  });

  test("crowded armies take more damage per body", () => {
    const { world, config, addArmy } = createBench();
    const lone = addArmy(50, 50, "Lone");
    const horde = addArmy(150, 120, "Horde");
    const single = world.addUnit(lone, "flesh-golem", 60, 50);
    const packed = Array.from({ length: 40 }, (_, index) =>
      world.addUnit(
        horde,
        "flesh-golem",
        150 + (index % 8),
        152 + Math.floor(index / 8),
      ),
    );
    const hp = single.hp;
    world.addBombing(60, 50, 0);
    world.addBombing(153.5, 154, 0);
    runBombings(world);
    const { damage, maxMultiplier } = config.world.bombings;
    expect(hp - single.hp).toBeCloseTo(damage);
    for (const unit of packed) {
      expect(hp - unit.hp).toBeCloseTo(damage * crowdMultiplier(world, 40));
    }
    expect(crowdMultiplier(world, 40)).toBeGreaterThan(1);
    expect(crowdMultiplier(world, 1000)).toBe(maxMultiplier);
  });

  test("units killed by a bombing stay with their army", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    const zombie = world.addUnit(army, "zombie", 120, 100);
    zombie.hp = 1;
    world.addBombing(120, 100, 0);
    runBombings(world);
    expect(world.entities.has(zombie.id)).toBe(false);
    const [corpse] = army.corpses;
    expect(corpse?.owner).toBe(army);
    expect(corpse?.killer).toBeUndefined();
    expect(config.world.bombings.name).not.toBe("");
  });

  test("a mage killed by a bombing names the bombing", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    army.mage.hp = 0.01;
    world.addBombing(100, 100, 0);
    runBombings(world);
    expect(army.alive).toBe(false);
    expect(army.killerName).toBe(config.world.bombings.name);
  });

  test("the zone shows its countdown, then its blast", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    const bombing = world.addBombing(102, 100, config.world.bombings.delaySec);
    const level = () =>
      (visibleEntities(world, army, { width: 40, height: 40 }).find(
        (entity) => entity.id === bombing.id,
      )?.flags ?? 0) >> 5;
    expect(level()).toBe(0);
    world.time = config.world.bombings.delaySec / 2;
    expect(level()).toBe(3);
    world.time = config.world.bombings.delaySec;
    runBombings(world);
    expect(level()).toBe(7);
    expect(
      visibleEntities(world, army, { width: 40, height: 40 }).find(
        (entity) => entity.id === bombing.id,
      )?.kind,
    ).toBe(EntityKind.Bombing);
  });
});
