import { describe, expect, test } from "vitest";
import { outlineMask } from "../src/game/outlines.js";

describe("outlineMask", () => {
  test("surrounds the opaque pixels with a one pixel border", () => {
    const mask = outlineMask((x, y) => (x === 1 && y === 1 ? 255 : 0), 3, 3);
    const rows = Array.from({ length: 5 }, (_, y) =>
      Array.from(mask.slice(y * 5, y * 5 + 5)).join(""),
    );
    expect(rows).toEqual(["00000", "01110", "01010", "01110", "00000"]);
  });
});
