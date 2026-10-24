import { describe, expect, test } from "vitest";
import { DemoCommand } from "@horde/shared";
import { demoCommand, isDemo } from "../src/demo.js";

const keys = { screamer: "k", boss: "p", units: "u" };

describe("demo", () => {
  test("is enabled by ?demo=1 only", () => {
    expect(isDemo("?demo=1")).toBe(true);
    expect(isDemo("?demo=0")).toBe(false);
    expect(isDemo("")).toBe(false);
  });

  test("maps the configured keys to commands", () => {
    expect(demoCommand("k", keys)).toBe(DemoCommand.Screamer);
    expect(demoCommand("P", keys)).toBe(DemoCommand.Boss);
    expect(demoCommand("u", keys)).toBe(DemoCommand.Units);
    expect(demoCommand("r", keys)).toBeUndefined();
  });
});
