import { describe, expect, test } from "vitest";
import { evolutionOptions, newlyAvailable } from "../src/evolution.js";

const content = {
  units: [
    {
      id: "zombie",
      name: "Zombie",
      evolutions: [
        { into: "big-zombie", cost: 5 },
        { into: "golem", cost: 10 },
      ],
    },
    { id: "big-zombie", name: "Big zombie", evolutions: [] },
    { id: "golem", name: "Flesh golem", evolutions: [] },
  ],
  items: [],
  npcs: [],
  pointsOfInterest: [],
  events: [],
  projectiles: [],
  mists: [],
  formations: [],
  skins: [],
};

describe("evolutionOptions", () => {
  test("lists nothing below the first threshold", () => {
    expect(evolutionOptions([{ type: 0, count: 4 }], content)).toEqual([]);
  });

  test("lists every evolution of the type, locked ones with progress", () => {
    expect(evolutionOptions([{ type: 0, count: 7 }], content)).toEqual([
      {
        into: "big-zombie",
        name: "Big zombie",
        from: "Zombie",
        cost: 5,
        count: 7,
        available: true,
      },
      {
        into: "golem",
        name: "Flesh golem",
        from: "Zombie",
        cost: 10,
        count: 7,
        available: false,
      },
    ]);
  });

  test("ignores unknown unit types", () => {
    expect(evolutionOptions([{ type: 9, count: 50 }], content)).toEqual([]);
  });
});

describe("newlyAvailable", () => {
  test("is true only when a new evolution becomes payable", () => {
    const seven = evolutionOptions([{ type: 0, count: 7 }], content);
    const twelve = evolutionOptions([{ type: 0, count: 12 }], content);
    expect(newlyAvailable(seven, new Set())).toBe(true);
    expect(newlyAvailable(seven, new Set(["big-zombie"]))).toBe(false);
    expect(newlyAvailable(twelve, new Set(["big-zombie"]))).toBe(true);
  });
});
