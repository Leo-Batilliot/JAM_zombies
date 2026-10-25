import { describe, expect, test } from "vitest";
import { levelFlags, maxFlagLevel } from "@horde/shared";
import { bombingCountdown, isBlast } from "../src/game/bombings.js";

describe("bombing zones", () => {
  test("the countdown fills up until the blast", () => {
    expect(bombingCountdown(levelFlags(0))).toBe(0);
    expect(bombingCountdown(levelFlags(maxFlagLevel - 1))).toBe(1);
    expect(isBlast(levelFlags(maxFlagLevel - 1))).toBe(false);
    expect(isBlast(levelFlags(maxFlagLevel))).toBe(true);
  });
});
