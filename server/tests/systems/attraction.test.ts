import { describe, expect, test } from "vitest";
import { updateTargets } from "../../src/systems/targeting.js";
import { createBench } from "../support/bench.js";

type Bench = ReturnType<typeof createBench>;

const setup = (enemyUnits: number, gap = 6) => {
  const bench = createBench();
  const army = bench.addArmy(100, 100);
  const unit = bench.world.addUnit(army, "zombie", 100, 100);
  const enemy = bench.addArmy(100 + gap + 5, 100, "Enemy");
  const foes = Array.from({ length: enemyUnits }, (_, index) =>
    bench.world.addUnit(enemy, "zombie", 100 + gap + (index % 3) * 0.5, 100),
  );
  return { bench, army, unit, enemy, foes };
};

const retarget = (bench: Bench): void => {
  updateTargets(bench.world);
};

describe("attraction toward enemies", () => {
  test("units still charge an enemy of their size", () => {
    const { bench, unit, foes } = setup(1);
    retarget(bench);
    expect(unit.targetId).toBe(foes[0]?.id);
  });

  test("units do not charge a much stronger army on their own", () => {
    const { bench, unit } = setup(5);
    retarget(bench);
    expect(unit.targetId).toBeUndefined();
  });

  test("units fight back when the stronger army attacks them", () => {
    const { bench, unit, foes } = setup(5);
    const [attacker] = foes;
    if (attacker === undefined) {
      throw new Error("Expected an enemy unit");
    }
    attacker.targetId = unit.id;
    attacker.retargetAt = Infinity;
    retarget(bench);
    expect(unit.targetId).toBe(attacker.id);
  });

  test("units fight a stronger enemy within contact range", () => {
    const { bench, unit, foes } = setup(5, 2);
    retarget(bench);
    expect(foes.map((foe) => foe.id)).toContain(unit.targetId);
  });

  test("an attack order still sends units against a stronger army", () => {
    const { bench, army, unit, enemy } = setup(5);
    army.focusId = enemy.mage.id;
    retarget(bench);
    expect(unit.targetId).toBe(enemy.mage.id);
  });

  test("units do not charge a camp much stronger than their army", () => {
    const bench = createBench();
    const army = bench.addArmy(100, 100);
    const unit = bench.world.addUnit(army, "zombie", 100, 100);
    const camp = bench.world.addCamp(107, 100, 600);
    bench.world.addCampNpc(camp, "soldier", 106, 100);
    bench.world.addCampNpc(camp, "soldier", 107, 100);
    retarget(bench);
    expect(unit.targetId).toBeUndefined();
  });
});
