import { describe, expect, test } from "vitest";
import type { Config } from "@horde/shared";
import { enclose, mainBodies } from "../../src/systems/battle.js";
import { kill } from "../../src/systems/death.js";
import { orderMove, orderRetreat } from "../../src/systems/orders.js";
import { interceptPoint, tunnelSlots } from "../../src/systems/retreat.js";
import type { Army, Unit, World } from "../../src/world/world.js";
import { createBench } from "../support/bench.js";

const sturdy = (config: Config): void => {
  const zombie = config.units.units["zombie"];
  if (zombie !== undefined) {
    zombie.hp = 100000;
  }
};

const fakeBattle = (world: World, army: Army, enemy: Army): void => {
  army.battle = {
    engagedAt: world.time,
    foes: [enclose(enemy, mainBodies(enemy))],
    encircled: false,
    freeSector: 2 * Math.PI,
    escapeAngle: Math.PI,
  };
};

const addGroup = (world: World, army: Army, units: Unit[]) => {
  const group = {
    army,
    units: new Set(units),
    corpses: new Set<never>(),
    anchorX: units[0]?.x ?? 0,
    anchorY: units[0]?.y ?? 0,
    engagedAt: world.time,
  };
  for (const unit of units) {
    unit.group = group;
  }
  army.groups.add(group);
  return group;
};

const contactBattle = (patch: (config: Config) => void = () => undefined) => {
  const bench = createBench((config) => {
    sturdy(config);
    patch(config);
  });
  const { world, addArmy, step } = bench;
  const army = addArmy(100, 100);
  const enemy = addArmy(125, 100, "Enemy");
  const contact = world.addUnit(army, "zombie", 110.9, 100);
  world.addUnit(enemy, "zombie", 112, 100);
  const others: Unit[] = [];
  for (let index = 0; index < 12; index++) {
    others.push(
      world.addUnit(army, "zombie", 95 + (index % 3), 98 + index / 3),
    );
  }
  step();
  return { ...bench, army, enemy, contact, others };
};

describe("retreat order", () => {
  test("is ignored outside battle", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    expect(orderRetreat(world, army, 50, 100)).toBe(false);
    expect(army.retreat).toBeUndefined();
  });

  test("units in contact are abandoned and the others form the tunnel", () => {
    const { world, army, contact, others } = contactBattle();
    expect(army.battle).toBeDefined();
    expect(contact.fighting).toBe(true);
    expect(orderRetreat(world, army, 50, 100)).toBe(true);
    expect(contact.group).toBeDefined();
    expect(others.every((unit) => unit.group === undefined)).toBe(true);
    const walls = [
      ...(army.retreat?.left ?? []),
      ...(army.retreat?.right ?? []),
    ];
    expect(walls).toHaveLength(others.length);
    expect(army.retreat?.escort).toBeUndefined();
  });

  test("corpses killed in this battle pass to their killer", () => {
    const { world, army, enemy, addArmy } = contactBattle();
    const other = addArmy(300, 300, "Other");
    const lost = world.addCorpse("zombie", army, enemy, 99, 100);
    const kept = world.addCorpse("zombie", army, other, 98, 100);
    orderRetreat(world, army, 50, 100);
    expect(lost.owner).toBe(enemy);
    expect(enemy.corpses.has(lost)).toBe(true);
    expect(kept.owner).toBe(army);
  });

  test("the mage leaves the aggro circle and the retreat ends at the exit", () => {
    const { world, config, army, step } = contactBattle();
    orderRetreat(world, army, 50, 100);
    step(config.network.tickRate * 12);
    expect(army.retreat).toBeUndefined();
    expect(Math.hypot(army.mage.x - 50, army.mage.y - 100)).toBeLessThanOrEqual(
      config.gameplay.retreat.arriveDistance,
    );
  });

  test("a move order cancels the retreat", () => {
    const { world, army } = contactBattle();
    orderRetreat(world, army, 50, 100);
    orderMove(world, army, 100, 120);
    expect(army.retreat).toBeUndefined();
  });
});

describe("abandoned units", () => {
  test("a dead abandoned unit leaves a corpse that waits for the outcome", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      config.gameplay.battle.endDelaySec = 100;
      config.gameplay.reanimation.delaySec = 0.5;
    });
    const army = addArmy(100, 100);
    const enemy = addArmy(200, 200, "Enemy");
    const victim = world.addUnit(army, "zombie", 140, 100);
    const group = addGroup(world, army, [
      victim,
      world.addUnit(army, "zombie", 141, 100),
    ]);
    kill(world, victim, enemy);
    const [corpse] = [...army.corpses];
    expect(corpse?.group).toBe(group);
    step(config.network.tickRate * 2);
    expect(corpse?.owner).toBe(army);
    expect(army.corpses.has(corpse as never)).toBe(true);
  });

  test("a destroyed group hands its corpses to their killers", () => {
    const { world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    const enemy = addArmy(200, 200, "Enemy");
    const victim = world.addUnit(army, "zombie", 140, 100);
    addGroup(world, army, [victim]);
    kill(world, victim, enemy);
    step();
    expect(army.groups.size).toBe(0);
    expect(enemy.corpses.size).toBe(1);
    expect(army.corpses.size).toBe(0);
  });

  test("a group that wins lifts the marks", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      config.gameplay.battle.endDelaySec = 0.5;
      config.gameplay.reanimation.delaySec = 100;
    });
    const army = addArmy(100, 100);
    const enemy = addArmy(200, 200, "Enemy");
    const survivor = world.addUnit(army, "zombie", 140, 100);
    const group = addGroup(world, army, [survivor]);
    const corpse = world.addCorpse("zombie", army, enemy, 141, 100);
    corpse.group = group;
    group.corpses.add(corpse as never);
    step(config.network.tickRate);
    expect(army.groups.size).toBe(0);
    expect(survivor.group).toBeUndefined();
    expect(corpse.group).toBeUndefined();
    expect(corpse.owner).toBe(army);
  });

  test("abandoned units hold their position instead of following", () => {
    const { world, addArmy, step } = createBench((config) => {
      config.gameplay.battle.endDelaySec = 100;
    });
    const army = addArmy(100, 100);
    const unit = world.addUnit(army, "zombie", 140, 100);
    addGroup(world, army, [unit]);
    step(5);
    expect(unit.x).toBe(140);
  });

  test("abandoned units fight around where they were left", () => {
    const { world, addArmy, step } = createBench((config) => {
      config.gameplay.battle.endDelaySec = 100;
    });
    const army = addArmy(100, 100);
    const enemy = addArmy(170, 100, "Enemy");
    const unit = world.addUnit(army, "zombie", 160, 100);
    addGroup(world, army, [unit]);
    const foe = world.addUnit(enemy, "zombie", 163, 100);
    step();
    expect(unit.targetId).toBe(foe.id);
  });
});

describe("regroup", () => {
  test("a unit far from its place comes back faster", () => {
    const { world, config, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    const far = world.addUnit(army, "zombie", 140, 100);
    step();
    const { speed } = config.units.units["zombie"] ?? { speed: 0 };
    const expected =
      (speed * config.gameplay.regroup.speedMultiplier) /
      config.network.tickRate;
    expect(140 - far.x).toBeCloseTo(expected, 1);
    expect(far.returning).toBe(true);
    step(config.network.tickRate * 5);
    expect(far.returning).toBe(false);
  });
});

describe("retreat tunnel", () => {
  const setup = (count: number) => {
    const bench = createBench();
    const { world, addArmy } = bench;
    const army = addArmy(100, 100);
    const enemy = addArmy(100, 120, "Enemy");
    const units: Unit[] = [];
    for (let index = 0; index < count; index++) {
      units.push(
        world.addUnit(army, "zombie", 98 + (index % 4), 99 + index / 8),
      );
    }
    fakeBattle(world, army, enemy);
    orderRetreat(world, army, 100, 50);
    return { ...bench, army, enemy, units };
  };

  const lateral = (army: Army, point: { x: number; y: number }) => {
    const retreat = army.retreat;
    if (retreat === undefined) {
      throw new Error("Expected a retreat");
    }
    return (
      (point.x - retreat.originX) * -retreat.dirY +
      (point.y - retreat.originY) * retreat.dirX
    );
  };

  test("units form two walls on each side of the corridor", () => {
    const { world, config, army } = setup(12);
    const slots = [...tunnelSlots(world, army).values()];
    const { corridorWidth, wingRows, wingFlare } = config.gameplay.retreat;
    expect(slots).toHaveLength(12);
    expect(slots.filter((slot) => slot.side < 0)).toHaveLength(6);
    for (const slot of slots) {
      expect(Math.abs(lateral(army, slot))).toBeGreaterThanOrEqual(
        corridorWidth / 2 - 1e-9,
      );
    }
    const base = slots.filter((slot) => slot.wing);
    expect(base).toHaveLength(2 * wingRows);
    expect(
      Math.max(...base.map((slot) => Math.abs(lateral(army, slot)))),
    ).toBeCloseTo(corridorWidth / 2 + wingRows * wingFlare);
  });

  test("the walls fold from the base once the mage has passed", () => {
    const { world, config, army } = setup(12);
    const retreat = army.retreat;
    if (retreat === undefined) {
      throw new Error("Expected a retreat");
    }
    const { spacing, foldMargin } = config.gameplay.retreat;
    const passed = spacing + foldMargin + 0.1;
    world.setPosition(
      army.mage,
      retreat.originX + retreat.dirX * passed,
      retreat.originY + retreat.dirY * passed,
    );
    const firstLeft = retreat.left[0];
    const slots = tunnelSlots(world, army);
    expect(retreat.released).toBe(2);
    expect(slots.size).toBe(8);
    expect(firstLeft !== undefined && slots.has(firstLeft)).toBe(false);
  });

  test("the walls close up when a unit dies", () => {
    const { world, army } = setup(12);
    const victim = army.retreat?.left[1];
    if (victim === undefined) {
      throw new Error("Expected a wall unit");
    }
    world.removeEntity(victim);
    const slots = tunnelSlots(world, army);
    expect(army.retreat?.left).toHaveLength(5);
    expect(slots.size).toBe(11);
  });

  test("too few units escort the mage instead", () => {
    const { world, config, army, units } = setup(3);
    const slots = tunnelSlots(world, army);
    expect(army.retreat?.escort).toHaveLength(3);
    for (const unit of units) {
      const slot = slots.get(unit);
      expect(
        Math.hypot((slot?.x ?? 0) - army.mage.x, (slot?.y ?? 0) - army.mage.y),
      ).toBeCloseTo(config.gameplay.retreat.escortRadius);
    }
  });

  test("a wing moves to cut off an enemy going around the tunnel", () => {
    const { world, army, enemy } = setup(12);
    const wing = [...tunnelSlots(world, army)].find(
      ([, slot]) => slot.wing && slot.side > 0,
    );
    if (wing === undefined) {
      throw new Error("Expected a wing");
    }
    const [unit, slot] = wing;
    const retreat = army.retreat;
    if (retreat === undefined) {
      throw new Error("Expected a retreat");
    }
    const outsideX = slot.x - retreat.dirY * 2;
    const outsideY = slot.y + retreat.dirX * 2;
    const runner = world.addUnit(enemy, "zombie", outsideX, outsideY);
    const goal = interceptPoint(world, unit, slot);
    expect(goal).not.toEqual({ x: slot.x, y: slot.y });
    expect(Math.hypot(goal.x - runner.x, goal.y - runner.y)).toBeLessThan(
      Math.hypot(slot.x - runner.x, slot.y - runner.y),
    );
    world.setPosition(runner, retreat.originX, retreat.originY);
    expect(interceptPoint(world, unit, slot)).toEqual(slot);
  });
});
