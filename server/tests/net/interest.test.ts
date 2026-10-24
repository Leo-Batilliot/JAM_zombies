import { describe, expect, test } from "vitest";
import { EntityFlag, EntityKind } from "@horde/shared";
import { visibleEntities } from "../../src/net/interest.js";
import { createBench } from "../support/bench.js";

const viewAround = { width: 20, height: 20 };

describe("visibleEntities", () => {
  test("keeps only entities in the view plus the margin", () => {
    const { world, addArmy } = createBench((config) => {
      config.network.interestMargin = 5;
    });
    const army = addArmy(100, 100);
    const self = army.mage;
    const inMargin = addArmy(124, 100).mage;
    addArmy(126, 100);
    const ids = visibleEntities(world, army, {
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
    const army = addArmy(100, 100);
    const self = army.mage;
    addArmy(150, 100);
    const entities = visibleEntities(world, army, {
      width: 1000,
      height: 1000,
    });
    expect(entities.map((entity) => entity.id)).toEqual([self.id]);
  });

  test("describes units with their type and army", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const unit = world.addUnit(army, "zombie", 101, 100);
    const entities = visibleEntities(world, army, {
      width: 10,
      height: 10,
    });
    expect(entities.find((entity) => entity.id === unit.id)).toMatchObject({
      kind: EntityKind.Unit,
      type: world.registries.units.index("zombie"),
      army: army.slot,
    });
  });

  test("flags a unit that has just risen", () => {
    const { config, world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    const unit = world.addUnit(army, "zombie", 101, 100);
    unit.raisedAt = world.time;
    const flagsOf = () =>
      visibleEntities(world, army, viewAround).find(
        (entity) => entity.id === unit.id,
      )?.flags ?? 0;
    expect(flagsOf() & EntityFlag.Rising).toBeTruthy();
    step(
      Math.ceil(config.gameplay.reanimation.riseSec * config.network.tickRate) +
        1,
    );
    expect(flagsOf() & EntityFlag.Rising).toBeFalsy();
  });

  test("flags a point of interest already searched by the viewer", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const other = addArmy(300, 300);
    const point = world.addPointOfInterest("mass-grave", 102, 100, 60);
    point.searchedBy.add(army);
    const flagsFor = (viewer: typeof army) =>
      visibleEntities(world, viewer, { width: 500, height: 500 }).find(
        (entity) => entity.id === point.id,
      )?.flags ?? 0;
    expect(flagsFor(army) & EntityFlag.Searched).toBeTruthy();
    expect(flagsFor(other) & EntityFlag.Searched).toBeFalsy();
  });
});
