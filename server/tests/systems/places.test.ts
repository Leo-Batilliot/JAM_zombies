import { describe, expect, test } from "vitest";
import { maintainPlaces } from "../../src/systems/places.js";
import { updateMists } from "../../src/systems/mists.js";
import { createBench } from "../support/bench.js";

const withPlace = (extra: object = {}) =>
  createBench((config) => {
    config.world.places = {
      fort: {
        district: "open",
        at: [0.5, 0.5],
        spread: 3,
        safeDistance: 0,
        respawnSec: 60,
        defenders: [
          { npc: "soldier", count: 2 },
          { npc: "mortar", count: 1 },
        ],
        chest: "camp-chest",
        ...extra,
      },
    };
    const open = config.world.city.templates["open"];
    if (open !== undefined) {
      open.min = 1;
    }
  });

describe("places", () => {
  test("garrison every district of their kind", () => {
    const { world } = withPlace();
    maintainPlaces(world);
    expect(world.places.size).toBe(world.city.districts.length);
    for (const state of world.places.values()) {
      expect(state.camp?.defenders.size).toBe(3);
      expect(state.camp?.marker).toBe(1);
    }
  });

  test("leave a chest once cleared, then come back later", () => {
    const { world } = withPlace();
    maintainPlaces(world);
    const [state] = world.places.values();
    for (const npc of [...(state?.camp?.defenders ?? [])]) {
      world.removeEntity(npc);
    }
    maintainPlaces(world);
    expect(state?.camp).toBeUndefined();
    expect([...world.points].some((point) => point.type === "camp-chest")).toBe(
      true,
    );
    world.time += 61;
    maintainPlaces(world);
    expect(state?.camp).toBeDefined();
  });

  test("shell armies in range of a living mortar", () => {
    const { world, addArmy } = withPlace({
      mortar: { npc: "mortar", range: 1000, intervalSec: 20 },
    });
    addArmy(50, 50);
    maintainPlaces(world);
    expect(world.bombings.size).toBeGreaterThan(0);
  });

  test("gas hurts walkers but not flyers", () => {
    const { world, addArmy } = withPlace({
      gas: { mist: "gas", count: 1, spread: 0 },
    });
    maintainPlaces(world);
    const [mist] = world.mists;
    const army = addArmy(5, 5);
    const walker = world.addUnit(army, "zombie", mist?.x ?? 0, mist?.y ?? 0);
    const flyer = world.addUnit(
      army,
      "carrion-flock",
      mist?.x ?? 0,
      mist?.y ?? 0,
    );
    updateMists(world, 1);
    expect(walker.hp).toBeLessThan(30);
    expect(flyer.hp).toBe(16);
  });
});
