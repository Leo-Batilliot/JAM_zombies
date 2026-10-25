import { describe, expect, test } from "vitest";
import { runAbilities, strike } from "../../src/systems/abilities.js";
import { killMage } from "../../src/systems/mage.js";
import { championExists, maintainPlaces } from "../../src/systems/places.js";
import { createBench } from "../support/bench.js";

const withLair = () =>
  createBench((config) => {
    config.world.places = {
      lair: {
        district: "open",
        at: [0.5, 0.5],
        spread: 2,
        safeDistance: 0,
        respawnSec: 30,
        defenders: [{ npc: "executioner", count: 1 }],
        chest: "camp-chest",
        champion: "executioner",
      },
    };
    const open = config.world.city.templates["open"];
    if (open !== undefined) {
      open.min = 1;
      open.max = 1;
    }
    config.world.city.columns = 1;
    config.world.city.rows = 1;
  });

describe("champions", () => {
  test("wait in a single lair while they exist somewhere", () => {
    const { world, addArmy } = withLair();
    maintainPlaces(world);
    const [state] = world.places.values();
    for (const npc of [...(state?.camp?.defenders ?? [])]) {
      world.removeEntity(npc);
    }
    const army = addArmy(5, 5);
    world.addUnit(army, "executioner", 5, 5);
    world.time += 31;
    maintainPlaces(world);
    expect(state?.camp).toBeUndefined();
    expect(championExists(world, "executioner")).toBe(true);
  });

  test("pass whole to the killer of their mage", () => {
    const { world, addArmy } = withLair();
    const owner = addArmy(5, 5, "Owner");
    world.addUnit(owner, "executioner", 5, 5);
    const killer = addArmy(20, 20, "Killer");
    killMage(world, owner, killer);
    expect([...killer.units].map((unit) => unit.type)).toContain("executioner");
  });

  test("go back to their lair when their mage dies to the city", () => {
    const { world, addArmy } = withLair();
    const owner = addArmy(5, 5, "Owner");
    world.addUnit(owner, "executioner", 5, 5);
    killMage(world, owner, undefined);
    expect(championExists(world, "executioner")).toBe(false);
    expect(
      [...world.points].every((point) =>
        (point.corpses ?? []).every((corpse) => corpse.type !== "executioner"),
      ),
    ).toBe(true);
    maintainPlaces(world);
    expect(championExists(world, "executioner")).toBe(true);
  });

  test("execute weak units and cleave around the target", () => {
    const { world, addArmy } = withLair();
    const champion = world.addUnit(addArmy(5, 5), "executioner", 50, 50);
    const foes = addArmy(80, 80, "Foes");
    const weak = world.addUnit(foes, "abomination", 51, 50);
    weak.hp = 20;
    const near = world.addUnit(foes, "zombie", 51.5, 50.5);
    strike(world, champion, weak, 1);
    expect(world.entities.has(weak.id)).toBe(false);
    expect(near.hp).toBeLessThan(30);
  });

  test("knock small units back when charging", () => {
    const { world, addArmy } = withLair();
    const army = addArmy(5, 5);
    const knight = world.addUnit(army, "grand-knight", 50, 50);
    knight.fighting = true;
    const foe = world.addUnit(addArmy(80, 80, "Foes"), "zombie", 51, 50);
    runAbilities(world, 0.05);
    expect(foe.x).toBeGreaterThan(51);
    expect(foe.hp).toBeLessThan(30);
  });

  test("heal nearby troops once converted", () => {
    const { world, addArmy } = withLair();
    const army = addArmy(5, 5);
    world.addUnit(army, "fallen-bishop", 50, 50);
    const hurt = world.addUnit(army, "zombie", 52, 50);
    hurt.hp = 10;
    runAbilities(world, 1);
    expect(hurt.hp).toBeGreaterThan(10);
  });
});
