import { describe, expect, test } from "vitest";
import { configSchema, isStructural } from "../../src/config/schema.js";

describe("structural values", () => {
  test("tick rate is structural", () => {
    expect(isStructural(configSchema.shape.network.shape.tickRate)).toBe(true);
  });

  test("interpolation delay is not structural", () => {
    expect(
      isStructural(configSchema.shape.network.shape.interpolationDelayMs),
    ).toBe(false);
  });
});
