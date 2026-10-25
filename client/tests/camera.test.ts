import { describe, expect, test } from "vitest";
import { easeZoom, zoomFor } from "../src/game/camera.js";

const camera = {
  baseZoom: 1,
  minZoom: 0.6,
  strengthScale: 100,
  factor: 0.25,
  smoothing: 0.1,
  resendRatio: 0.05,
  smallScreen: 600,
  smallScreenZoom: 0.5,
  smallScreenPixelRatio: 1,
};

describe("camera zoom", () => {
  test("zooms out as the army grows, down to the minimum", () => {
    expect(zoomFor(0, camera)).toBe(1);
    expect(zoomFor(100, camera)).toBeLessThan(1);
    expect(zoomFor(300, camera)).toBeLessThan(zoomFor(100, camera));
    expect(zoomFor(1e9, camera)).toBe(0.6);
  });

  test("eases toward the target", () => {
    expect(easeZoom(1, 0.5, camera)).toBeCloseTo(0.95);
  });
});
