import { describe, expect, test } from "vitest";
import { damage, kill } from "../../src/systems/death.js";
import { damageBonus, grantItem } from "../../src/systems/equipment.js";
import { killMage } from "../../src/systems/mage.js";
import { createMassGrave } from "../../src/systems/points.js";
import { createBench } from "../support/bench.js";

describe("equipping items", () => {
  test("an item equips the strongest compatible unit without an item", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const zombie = world.addUnit(army, "zombie", 101, 100);
    const big = world.addUnit(army, "big-zombie", 99, 100);
    grantItem(world, army, "shovel");
    expect(big.item).toBe("shovel");
    expect(zombie.item).toBeUndefined();
    grantItem(world, army, "cricket-bat");
    expect(zombie.item).toBe("cricket-bat");
    expect(army.inventory).toEqual([]);
  });

  test("an item without a free unit waits in the inventory", () => {
    const { world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    grantItem(world, army, "shovel");
    expect(army.inventory).toEqual(["shovel"]);
    const unit = world.addUnit(army, "zombie", 101, 100);
    step();
    expect(unit.item).toBe("shovel");
    expect(army.inventory).toEqual([]);
  });

  test("the best item goes to the best unit first", () => {
    const { world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    army.inventory.push("shovel", "chainsaw");
    const zombie = world.addUnit(army, "zombie", 101, 100);
    const big = world.addUnit(army, "big-zombie", 99, 100);
    step();
    expect(big.item).toBe("chainsaw");
    expect(zombie.item).toBe("shovel");
  });

  test("abandoned units are never equipped", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const unit = world.addUnit(army, "zombie", 101, 100);
    unit.group = {
      army,
      units: new Set([unit]),
      corpses: new Set(),
      anchorX: 101,
      anchorY: 100,
      engagedAt: 0,
    };
    grantItem(world, army, "shovel");
    expect(unit.item).toBeUndefined();
  });

  test("a weapon multiplies the damage of its unit", () => {
    const { world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    const unit = world.addUnit(army, "zombie", 101, 100);
    expect(damageBonus(world, unit)).toBe(1);
    unit.item = "chainsaw";
    const { damage: bonus } = world.registries.items.get("chainsaw");
    expect(damageBonus(world, unit)).toBe(bonus);
    const boss = world.addEventNpc("evil-pumpkin", 101.5, 100, "test");
    const before = boss.hp;
    unit.targetId = boss.id;
    unit.retargetAt = Infinity;
    step();
    const { damage: base } = world.registries.units.get("zombie");
    expect(before - boss.hp).toBeCloseTo(base * bonus);
  });
});

describe("equipment is kept", () => {
  test("through death and reanimation", () => {
    const { config, world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    const unit = world.addUnit(army, "zombie", 101, 100);
    unit.item = "cricket-bat";
    kill(world, unit, undefined);
    const [corpse] = army.corpses;
    expect(corpse?.item).toBe("cricket-bat");
    step(config.gameplay.reanimation.delaySec * config.network.tickRate + 1);
    const [raised] = army.units;
    expect(raised?.item).toBe("cricket-bat");
  });

  test("when a unit changes side or falls into the mass grave", () => {
    const { world, addArmy } = createBench((config) => {
      config.gameplay.transfer.share = 0.5;
    });
    const army = addArmy(100, 100);
    const killer = addArmy(130, 100, "Killer");
    for (let index = 0; index < 4; index++) {
      world.addUnit(army, "zombie", 101, 100).item = "shovel";
    }
    army.inventory.push("chainsaw");
    killMage(world, army, killer);
    expect([...killer.units].map((unit) => unit.item)).toEqual([
      "shovel",
      "shovel",
    ]);
    const [grave] = world.points;
    expect(grave?.corpses).toEqual([
      { type: "zombie", item: "shovel" },
      { type: "zombie", item: "shovel" },
    ]);
    expect(army.inventory).toEqual([]);
  });

  test("when a looter raises a mass grave", () => {
    const { config, world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    createMassGrave(world, 101, 100, [{ type: "zombie", item: "chainsaw" }]);
    step(config.network.tickRate * 3);
    expect([...army.units].map((unit) => unit.item)).toEqual(["chainsaw"]);
  });

  test("an infected civilian joins without an item", () => {
    const { world, addArmy, addCivilians } = createBench();
    const army = addArmy(100, 100);
    const group = addCivilians(101, 100, 1);
    const [civilian] = group.members;
    if (civilian !== undefined) {
      damage(world, civilian, 1000, army);
    }
    const [unit] = army.units;
    expect(unit?.item).toBeUndefined();
  });
});

describe("looting cars and chests", () => {
  const lootBench = () =>
    createBench((config) => {
      Object.assign(config.world.pointsOfInterest["car"] ?? {}, {
        searchSec: 1,
        radius: 3,
        loot: [{ item: "shovel", weight: 1 }],
      });
    });

  test("a search gives an item from the loot table and the car stays", () => {
    const { config, world, addArmy, step } = lootBench();
    const army = addArmy(100, 100);
    const unit = world.addUnit(army, "zombie", 99, 100);
    const car = world.addPointOfInterest("car", 101, 100, 600);
    step(config.network.tickRate * 2);
    expect(unit.item).toBe("shovel");
    expect(world.points.has(car)).toBe(true);
    expect(car.searchedBy.has(army)).toBe(true);
  });

  test("each army loots the same car once", () => {
    const { config, world, addArmy, step } = lootBench();
    const first = addArmy(100, 100);
    const second = addArmy(102, 100, "Second");
    world.addPointOfInterest("car", 101, 100, 600);
    step(config.network.tickRate * 4);
    expect(first.inventory).toEqual(["shovel"]);
    expect(second.inventory).toEqual(["shovel"]);
  });

  test("the item found is reported during its tick only", () => {
    const { config, world, addArmy, step } = lootBench();
    const army = addArmy(100, 100);
    world.addPointOfInterest("car", 101, 100, 600);
    let reported: string[] = [];
    for (let tick = 0; tick < config.network.tickRate * 2; tick++) {
      step();
      reported = [...reported, ...army.found];
    }
    expect(reported).toEqual(["shovel"]);
    expect(army.found).toEqual([]);
  });
});
