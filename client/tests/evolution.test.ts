import { describe, expect, test } from "vitest";
import { availableEvolutions } from "../src/evolution.js";

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
};

describe("availableEvolutions", () => {
  test("lists nothing below the cost", () => {
    expect(availableEvolutions([{ type: 0, count: 4 }], content)).toEqual([]);
  });

  test("lists every evolution the army can pay", () => {
    expect(availableEvolutions([{ type: 0, count: 5 }], content)).toEqual([
      { into: "big-zombie", name: "Big zombie", from: "Zombie", cost: 5 },
    ]);
    expect(
      availableEvolutions([{ type: 0, count: 12 }], content).map(
        (choice) => choice.into,
      ),
    ).toEqual(["big-zombie", "golem"]);
  });

  test("ignores unknown unit types", () => {
    expect(availableEvolutions([{ type: 9, count: 50 }], content)).toEqual([]);
  });
});
