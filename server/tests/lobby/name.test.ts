import { describe, expect, test } from "vitest";
import { validatePlayerName } from "../../src/lobby/name.js";

const rules = { minLength: 2, maxLength: 5, pattern: "^[\\p{L}\\p{N} _-]+$" };

describe("validatePlayerName", () => {
  test("accepts and trims a valid name", () => {
    expect(validatePlayerName("  Léa ", rules)).toBe("Léa");
  });

  test("rejects names that are too short or too long", () => {
    expect(validatePlayerName("a", rules)).toBeUndefined();
    expect(validatePlayerName("abcdef", rules)).toBeUndefined();
  });

  test("rejects forbidden characters", () => {
    expect(validatePlayerName("<b>", rules)).toBeUndefined();
  });
});
