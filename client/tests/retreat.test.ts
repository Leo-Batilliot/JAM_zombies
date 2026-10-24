import { describe, expect, test } from "vitest";
import { BattleFlag } from "@horde/shared";
import { canRetreat } from "../src/retreat.js";
import { pulse } from "../src/game/battle.js";

describe("retreat", () => {
  test("is available only in battle and when not encircled", () => {
    expect(canRetreat(0)).toBe(false);
    expect(canRetreat(BattleFlag.InBattle)).toBe(true);
    expect(canRetreat(BattleFlag.InBattle | BattleFlag.Retreating)).toBe(true);
    expect(canRetreat(BattleFlag.InBattle | BattleFlag.Encircled)).toBe(false);
  });
});

describe("aggro circle pulse", () => {
  test("stays visible over a whole period", () => {
    for (let now = 0; now < 1000; now += 50) {
      const alpha = pulse(now, 1000);
      expect(alpha).toBeGreaterThanOrEqual(0.1);
      expect(alpha).toBeLessThanOrEqual(1);
    }
  });
});
