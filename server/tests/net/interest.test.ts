import { describe, expect, test } from "vitest";
import { visibleEntities } from "../../src/net/interest.js";
import { createBench } from "../support/bench.js";

describe("visibleEntities", () => {
  test("keeps only entities in the view plus the margin", () => {
    const { world, addMage } = createBench((config) => {
      config.network.interestMargin = 5;
    });
    const self = addMage(100, 100);
    const inMargin = addMage(124, 100);
    addMage(126, 100);
    const ids = visibleEntities(world, self.x, self.y, {
      width: 40,
      height: 20,
    }).map((entity) => entity.id);
    expect(ids.sort()).toEqual([self.id, inMargin.id].sort());
  });

  test("caps the view size", () => {
    const { world, addMage } = createBench((config) => {
      config.network.interestMargin = 0;
      config.network.maxViewSize = 20;
    });
    const self = addMage(100, 100);
    addMage(150, 100);
    const entities = visibleEntities(world, self.x, self.y, {
      width: 1000,
      height: 1000,
    });
    expect(entities.map((entity) => entity.id)).toEqual([self.id]);
  });
});
