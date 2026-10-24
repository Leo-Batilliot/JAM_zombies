import { describe, expect, test } from "vitest";
import { EntityKind } from "@horde/shared";
import { visibleEntities } from "../../src/net/interest.js";
import { createBench } from "../support/bench.js";

describe("visibleEntities", () => {
  test("keeps only entities in the view plus the margin", () => {
    const { world, addArmy } = createBench((config) => {
      config.network.interestMargin = 5;
    });
    const self = addArmy(100, 100).mage;
    const inMargin = addArmy(124, 100).mage;
    addArmy(126, 100);
    const ids = visibleEntities(world, self.x, self.y, {
      width: 40,
      height: 20,
    }).map((entity) => entity.id);
    expect(ids.sort()).toEqual([self.id, inMargin.id].sort());
  });

  test("caps the view size", () => {
    const { world, addArmy } = createBench((config) => {
      config.network.interestMargin = 0;
      config.network.maxViewSize = 20;
    });
    const self = addArmy(100, 100).mage;
    addArmy(150, 100);
    const entities = visibleEntities(world, self.x, self.y, {
      width: 1000,
      height: 1000,
    });
    expect(entities.map((entity) => entity.id)).toEqual([self.id]);
  });

  test("describes units with their type and army", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const unit = world.addUnit(army, "zombie", 101, 100);
    const entities = visibleEntities(world, 100, 100, {
      width: 10,
      height: 10,
    });
    expect(entities.find((entity) => entity.id === unit.id)).toMatchObject({
      kind: EntityKind.Unit,
      type: world.registries.units.index("zombie"),
      army: army.slot,
    });
  });
});
