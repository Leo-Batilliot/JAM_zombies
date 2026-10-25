import { describe, expect, test } from "vitest";
import { EntityFlag, EntityKind, flagLevel, maxFlagLevel } from "@horde/shared";
import { visibleEntities } from "../../src/net/interest.js";
import { createMassGrave } from "../../src/systems/points.js";
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

describe("phase 4 flags", () => {
  test("a corpse past its delay is marked as waiting", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    const fresh = world.addCorpse("zombie", army, undefined, 101, 100);
    const old = world.addCorpse("zombie", army, undefined, 102, 100);
    old.diedAt = world.time - config.gameplay.reanimation.delaySec;
    const flags = new Map(
      visibleEntities(world, army, viewAround).map((entity) => [
        entity.id,
        entity.flags,
      ]),
    );
    expect(flags.get(fresh.id)).toBe(0);
    expect(flags.get(old.id)).toBe(EntityFlag.Waiting);
  });

  test("an abandoned unit is marked as such", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const unit = world.addUnit(army, "zombie", 101, 100);
    unit.group = {
      army,
      units: new Set([unit]),
      corpses: new Set(),
      anchorX: 101,
      anchorY: 100,
      engagedAt: 0,
    };
    const entity = visibleEntities(world, army, viewAround).find(
      (candidate) => candidate.id === unit.id,
    );
    expect(entity?.kind).toBe(EntityKind.Unit);
    expect((entity?.flags ?? 0) & EntityFlag.Abandoned).toBe(
      EntityFlag.Abandoned,
    );
  });
});

describe("mass grave size", () => {
  test("grows with the number of corpses inside", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const level = (count: number): number => {
      const grave = createMassGrave(
        world,
        101,
        100,
        Array.from({ length: count }, () => ({
          type: "zombie",
          item: undefined,
        })),
      );
      const entity = visibleEntities(world, army, viewAround).find(
        (candidate) => candidate.id === grave?.id,
      );
      if (grave !== undefined) {
        world.removeEntity(grave);
      }
      return flagLevel(entity?.flags ?? 0);
    };
    expect(level(1)).toBe(0);
    expect(level(3)).toBe(1);
    expect(level(45)).toBe(5);
    expect(level(1000)).toBe(7);
  });
});

describe("sacred cross charge", () => {
  test("is full when ready and grows during the recharge", () => {
    const { world, addArmy } = createBench((config) => {
      config.world.crosses.rechargeSec = 10;
    });
    const army = addArmy(100, 100);
    const cross = world.addCross(102, 100, 600);
    const charge = (): number =>
      flagLevel(
        visibleEntities(world, army, viewAround).find(
          (entity) => entity.id === cross.id,
        )?.flags ?? -1,
      );
    expect(charge()).toBe(maxFlagLevel);
    cross.readyAt = world.time + 10;
    expect(charge()).toBe(0);
    cross.readyAt = world.time + 5;
    expect(charge()).toBe(3);
  });
});

describe("unit item", () => {
  test("is sent as its slot within the unit category", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    const unit = world.addUnit(army, "zombie", 101, 100);
    const slot = (): number =>
      flagLevel(
        visibleEntities(world, army, viewAround).find(
          (entity) => entity.id === unit.id,
        )?.flags ?? -1,
      );
    expect(slot()).toBe(0);
    unit.item = "cricket-bat";
    expect(slot()).toBe(2);
    unit.item = "laser";
    expect(slot()).toBe(0);
  });
});
