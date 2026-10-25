import { describe, expect, test } from "vitest";
import { castMagic } from "../../src/systems/magic.js";
import { createBench } from "../support/bench.js";

describe("mage magic", () => {
  test("a mage without units shoots the nearest civilian", () => {
    const { world, addArmy, addCivilians } = createBench();
    addArmy(100, 100);
    addCivilians(103, 100, 1);
    castMagic(world);
    expect(world.projectiles.size).toBe(1);
    castMagic(world);
    expect(world.projectiles.size).toBe(1);
  });
});
