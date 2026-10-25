import { describe, expect, test } from "vitest";
import { formationForKey } from "../src/formations.js";
import { mistColor } from "../src/game/mists.js";

describe("formationForKey", () => {
  test("maps the configured keys to formation indexes", () => {
    const keys = ["1", "2", "3", "4"];
    expect(formationForKey("1", keys)).toBe(0);
    expect(formationForKey("4", keys)).toBe(3);
    expect(formationForKey("5", keys)).toBeUndefined();
  });
});

describe("mistColor", () => {
  test("reads the configured color, white otherwise", () => {
    expect(mistColor({ necrotic: "#00ff00" }, "necrotic")).toBe(0x00ff00);
    expect(mistColor({}, "purifying")).toBe(0xffffff);
  });
});
