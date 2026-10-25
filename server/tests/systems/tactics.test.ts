import { describe, expect, test } from "vitest";
import { damage } from "../../src/systems/death.js";
import { slotOffsets } from "../../src/systems/formation.js";
import { killMage } from "../../src/systems/mage.js";
import { orderMove } from "../../src/systems/orders.js";
import {
  changeProgress,
  effectsOf,
  formationIndex,
  orderFormation,
} from "../../src/systems/tactics.js";
import type { Army, World } from "../../src/world/world.js";
import { createBench } from "../support/bench.js";

const settle = (world: World, army: Army, id: string): void => {
  orderFormation(world, army, id);
  army.formation = id;
  army.formationChange = undefined;
};

describe("formation changes", () => {
  test("a new formation applies after the change delay", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      config.formations.changeSec = 1;
    });
    const army = addArmy(100, 100);
    expect(orderFormation(world, army, "phalanx")).toBe(true);
    expect(army.formation).toBeUndefined();
    expect(effectsOf(world, army)).toBe(config.formations.neutral);
    step(config.network.tickRate / 2);
    expect(changeProgress(world, army)).toBeCloseTo(0.5, 1);
    step(config.network.tickRate / 2 + 1);
    expect(army.formation).toBe("phalanx");
    expect(formationIndex(world, army.formation)).toBe(1);
    expect(effectsOf(world, army)).toBe(
      config.formations.selectable["phalanx"],
    );
  });

  test("bonuses are lost during a change", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    settle(world, army, "phalanx");
    orderFormation(world, army, "swarm");
    expect(effectsOf(world, army)).toBe(config.formations.neutral);
  });

  test("an unknown or current formation is ignored", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    expect(orderFormation(world, army, "turtle")).toBe(false);
    expect(orderFormation(world, army, "toString")).toBe(false);
    settle(world, army, "wedge");
    expect(orderFormation(world, army, "wedge")).toBe(false);
  });

  test("the army is back to neutral after the mage dies", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    settle(world, army, "circle");
    killMage(world, army, undefined);
    expect(army.formation).toBeUndefined();
  });
});

describe("formation layouts", () => {
  const { config } = createBench();
  const formation = (id: string) => {
    const entry = config.formations.selectable[id];
    if (entry === undefined) {
      throw new Error(`Missing formation ${id}`);
    }
    return entry;
  };
  const widest = (offsets: { right: number }[]) =>
    Math.max(...offsets.map((offset) => Math.abs(offset.right)));

  test("the phalanx is wider than the neutral block", () => {
    expect(widest(slotOffsets(20, 0, formation("phalanx")))).toBeGreaterThan(
      widest(slotOffsets(20, 0, config.formations.neutral)),
    );
  });

  test("the wedge points forward with a single unit at the tip", () => {
    const offsets = slotOffsets(6, 0, formation("wedge"));
    const tip = Math.max(...offsets.map((offset) => offset.forward));
    expect(offsets.filter((offset) => offset.forward === tip)).toHaveLength(1);
    expect(offsets.every((offset) => offset.forward > 0)).toBe(true);
  });

  test("the circle surrounds the mage with ranged units inside", () => {
    const circle = formation("circle");
    const offsets = slotOffsets(20, 10, circle);
    const radius = (offset: { forward: number; right: number }) =>
      Math.hypot(offset.forward, offset.right);
    expect(
      offsets.every((offset) => radius(offset) >= circle.frontOffset - 1e-9),
    ).toBe(true);
    const front = offsets.slice(0, 20).map(radius);
    const back = offsets.slice(20).map(radius);
    expect(Math.max(...back)).toBeLessThanOrEqual(Math.min(...front) + 1e-9);
  });

  test("the swarm spreads units apart", () => {
    const offsets = slotOffsets(12, 0, formation("swarm"));
    const keys = new Set(
      offsets.map(
        (offset) => `${offset.forward.toFixed(2)}:${offset.right.toFixed(2)}`,
      ),
    );
    expect(keys.size).toBe(12);
  });
});

describe("formation effects", () => {
  test("the swarm moves faster than the neutral formation", () => {
    const run = (id: string | undefined) => {
      const { world, addArmy, step } = createBench();
      const army = addArmy(100, 100);
      if (id !== undefined) {
        settle(world, army, id);
      }
      orderMove(world, army, 200, 100);
      step(10);
      return army.mage.x - 100;
    };
    expect(run("swarm")).toBeGreaterThan(run(undefined));
    expect(run("phalanx")).toBeLessThan(run(undefined));
  });

  test("the phalanx protects its units", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    settle(world, army, "phalanx");
    const unit = world.addUnit(army, "zombie", 130, 100);
    const hp = unit.hp;
    damage(world, unit, 10, undefined);
    const defense = config.formations.selectable["phalanx"]?.defense ?? 0;
    expect(hp - unit.hp).toBeCloseTo(10 * (1 - defense));
  });

  test("the wedge hits harder right after the impact", () => {
    const hit = (id: string | undefined) => {
      const { world, addArmy, step } = createBench();
      const army = addArmy(100, 100);
      if (id !== undefined) {
        settle(world, army, id);
      }
      const unit = world.addUnit(army, "zombie", 101, 100);
      const boss = world.addEventNpc("evil-pumpkin", 103.5, 100, "test");
      unit.targetId = boss.id;
      unit.retargetAt = Infinity;
      const hp = boss.hp;
      step();
      return hp - boss.hp;
    };
    const impact =
      createBench().config.formations.selectable["wedge"]?.impact?.damage ?? 1;
    expect(hit("wedge")).toBeCloseTo(hit(undefined) * impact);
  });

  test("the circle keeps the guard full even far from the mage", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    const guard = world.addUnit(army, "zombie", 140, 100);
    const hp = guard.hp;
    damage(world, army.mage, 5, undefined);
    expect(guard.hp).toBe(hp);
    settle(world, army, "circle");
    damage(world, army.mage, 5, undefined);
    expect(guard.hp).toBeCloseTo(hp - 5 * config.gameplay.soulLink.share);
  });
});
