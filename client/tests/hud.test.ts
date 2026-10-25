import { describe, expect, test } from "vitest";
import type { Status } from "@horde/shared";
import { bossLabel } from "../src/bossbar.js";
import { slowText, xpRatio } from "../src/hud.js";
import { plateText } from "../src/game/plates.js";

const status = (souls: number): Status =>
  ({ souls, levelSouls: 10, nextSouls: 30 }) as Status;

describe("hud", () => {
  test("the experience bar shows the progress inside the level", () => {
    expect(xpRatio(status(10))).toBe(0);
    expect(xpRatio(status(20))).toBe(0.5);
    expect(xpRatio(status(45))).toBe(1);
  });

  test("the slowness shows only when the army is slowed", () => {
    expect(slowText(1)).toBe("");
    expect(slowText(0.83)).toBe("Slow -17%");
  });

  test("plates and the boss bar show current and maximum values", () => {
    expect(
      plateText({ army: 1, name: "Ash", strength: 12, potential: 20 }),
    ).toBe("12 / 20");
    expect(bossLabel({ event: 0, hp: 350, maxHp: 1000 })).toBe("350 HP / 1000");
  });
});
