import { describe, expect, test } from "vitest";
import { separateBodies } from "../../src/systems/separation.js";
import { blockBodies } from "../../src/systems/walls.js";
import { createBench } from "../support/bench.js";

const withBuilding = () =>
  createBench((config) => {
    const open = config.world.city.templates["open"];
    if (open !== undefined) {
      open.obstacles = [{ kind: "building", rect: [0.2, 0.2, 0.6, 0.6] }];
    }
  });

describe("body layers", () => {
  test("flyers cross buildings, ground units are pushed out", () => {
    const { world, addArmy } = withBuilding();
    const army = addArmy(5, 5);
    const district = world.city.districts[5];
    if (district === undefined) {
      throw new Error("No district");
    }
    const x = district.x + district.size / 2;
    const y = district.y + district.size / 2;
    const flyer = world.addUnit(army, "carrion-flock", x, y);
    const walker = world.addUnit(army, "zombie", x, y);
    blockBodies(world);
    expect([flyer.x, flyer.y]).toEqual([x, y]);
    expect(world.obstacles.isFree(walker.x, walker.y, 0.4)).toBe(true);
  });

  test("flyers only push flyers, spectres push nobody", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(5, 5);
    const flyer = world.addUnit(army, "carrion-flock", 50, 50);
    const walker = world.addUnit(army, "zombie", 50, 50);
    const soul = world.addUnit(army, "wandering-soul", 60, 60);
    const other = world.addUnit(army, "zombie", 60, 60);
    const flock = world.addUnit(army, "carrion-flock", 70, 70);
    const wing = world.addUnit(army, "carrion-flock", 70, 70);
    separateBodies(world);
    expect([flyer.x, flyer.y, walker.x, walker.y]).toEqual([50, 50, 50, 50]);
    expect([soul.x, soul.y, other.x, other.y]).toEqual([60, 60, 60, 60]);
    expect(Math.hypot(flock.x - wing.x, flock.y - wing.y)).toBeGreaterThan(0);
  });
});
