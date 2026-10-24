import { describe, expect, test } from "vitest";
import { placeDecor } from "../src/game/decor.js";

const world = {
  width: 100,
  height: 50,
  decor: {
    seed: 7,
    scattered: [
      { sprite: "decor-tree", count: 20 },
      { sprite: "decor-rock", count: 5 },
    ],
  },
};

describe("placeDecor", () => {
  test("places the configured count of each sprite inside the map", () => {
    const items = placeDecor(world);
    expect(items.filter((item) => item.sprite === "decor-tree")).toHaveLength(
      20,
    );
    expect(items.filter((item) => item.sprite === "decor-rock")).toHaveLength(
      5,
    );
    for (const item of items) {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.x).toBeLessThanOrEqual(100);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeLessThanOrEqual(50);
    }
  });

  test("gives the same layout for the same seed", () => {
    expect(placeDecor(world)).toEqual(placeDecor(world));
  });

  test("sorts items from back to front", () => {
    const ys = placeDecor(world).map((item) => item.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
  });
});
