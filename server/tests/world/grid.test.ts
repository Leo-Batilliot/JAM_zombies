import { describe, expect, test } from "vitest";
import { SpatialGrid } from "../../src/world/grid.js";

const sorted = (ids: number[]) => [...ids].sort((a, b) => a - b);

describe("SpatialGrid", () => {
  test("finds entities in a rectangle", () => {
    const grid = new SpatialGrid(10);
    grid.insert(1, 5, 5);
    grid.insert(2, 15, 5);
    grid.insert(3, 50, 50);
    expect(sorted(grid.queryRect(0, 0, 20, 10))).toEqual([1, 2]);
  });

  test("finds entities in a radius", () => {
    const grid = new SpatialGrid(10);
    grid.insert(1, 0, 0);
    grid.insert(2, 3, 4);
    grid.insert(3, 6, 6);
    expect(sorted(grid.queryRadius(0, 0, 5))).toEqual([1, 2]);
  });

  test("moves an entity across cells", () => {
    const grid = new SpatialGrid(10);
    grid.insert(1, 5, 5);
    grid.update(1, 95, 95);
    expect(grid.queryRect(0, 0, 10, 10)).toEqual([]);
    expect(grid.queryRect(90, 90, 100, 100)).toEqual([1]);
  });

  test("removes an entity", () => {
    const grid = new SpatialGrid(10);
    grid.insert(1, 5, 5);
    grid.remove(1);
    expect(grid.size).toBe(0);
    expect(grid.queryRadius(5, 5, 10)).toEqual([]);
  });

  test("handles entities exactly on cell borders", () => {
    const grid = new SpatialGrid(10);
    grid.insert(1, 10, 10);
    expect(grid.queryRect(0, 0, 10, 10)).toEqual([1]);
    expect(grid.queryRadius(0, 0, Math.hypot(10, 10))).toEqual([1]);
  });
});
