import { describe, expect, test } from "vitest";
import { EntityKind } from "@horde/shared";
import { kill } from "../../src/systems/death.js";
import { createBench } from "../support/bench.js";

const corpses = (world: { entities: Map<number, { kind: EntityKind }> }) =>
  [...world.entities.values()].filter(
    (entity) => entity.kind === EntityKind.Corpse,
  );

describe("corpses", () => {
  test("a killed unit leaves a corpse of its type for its own army", () => {
    const { world, addArmy } = createBench();
    const owner = addArmy(100, 100);
    const killer = addArmy(150, 100);
    const unit = world.addUnit(owner, "zombie", 110, 100);
    kill(world, unit, killer);
    expect(owner.units.size).toBe(0);
    const [corpse] = [...owner.corpses];
    expect(corpse).toMatchObject({
      type: "zombie",
      owner,
      killer,
      x: 110,
      y: 100,
    });
  });

  test("a killed civilian leaves a zombie corpse for its killer", () => {
    const { world, addArmy, addCivilians } = createBench();
    const killer = addArmy(100, 100);
    const npc = [...addCivilians(110, 100, 1).members][0];
    if (npc === undefined) {
      throw new Error("Expected a civilian");
    }
    kill(world, npc, killer);
    expect([...killer.corpses][0]).toMatchObject({ type: "zombie", killer });
  });

  test("a unit killed without a killer army stays with its army", () => {
    const { world, addArmy } = createBench();
    const owner = addArmy(100, 100);
    kill(world, world.addUnit(owner, "zombie", 101, 100), undefined);
    expect([...owner.corpses][0]?.owner).toBe(owner);
  });

  test("a civilian killed without a killer army leaves no corpse", () => {
    const { world, addCivilians } = createBench();
    const npc = [...addCivilians(110, 100, 1).members][0];
    if (npc === undefined) {
      throw new Error("Expected a civilian");
    }
    kill(world, npc, undefined);
    expect(corpses(world)).toHaveLength(0);
  });
});

describe("reanimation", () => {
  test("a corpse rises near its mage after the delay", () => {
    const { config, world, addArmy, step } = createBench((config) => {
      config.gameplay.reanimation.delaySec = 2;
      config.gameplay.reanimation.raiseRadius = 3;
    });
    const owner = addArmy(100, 100);
    world.addCorpse("zombie", owner, undefined, 300, 300);
    step(config.network.tickRate);
    expect(owner.units.size).toBe(0);
    step(config.network.tickRate + 1);
    expect(corpses(world)).toHaveLength(0);
    const [unit] = [...owner.units];
    expect(unit?.type).toBe("zombie");
    expect(
      Math.hypot((unit?.x ?? 0) - owner.mage.x, (unit?.y ?? 0) - owner.mage.y),
    ).toBeLessThan(4);
  });

  test("corpses disappear with their army", () => {
    const { world, addArmy } = createBench();
    const owner = addArmy(100, 100);
    world.addCorpse("zombie", owner, undefined, 120, 100);
    world.removeArmy(owner);
    expect(corpses(world)).toHaveLength(0);
  });
});
