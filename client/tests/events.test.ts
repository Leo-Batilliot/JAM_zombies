import { describe, expect, test } from "vitest";
import { edgeArrow, eventMessage } from "../src/events.js";

describe("edgeArrow", () => {
  test("hides the arrow when the target is on screen", () => {
    expect(edgeArrow(100, -50, 400, 200, 40)).toBeUndefined();
  });

  test("places the arrow on the edge toward the target", () => {
    const arrow = edgeArrow(1000, 0, 400, 200, 40);
    expect(arrow?.x).toBeCloseTo(360);
    expect(arrow?.y).toBeCloseTo(0);
    expect(arrow?.angle).toBeCloseTo(0);
  });

  test("keeps the direction of a diagonal target", () => {
    const arrow = edgeArrow(-800, 800, 400, 200, 40);
    expect(arrow?.y).toBeCloseTo(160);
    expect(arrow?.x).toBeCloseTo(-160);
    expect(arrow?.angle).toBeCloseTo((3 * Math.PI) / 4);
  });
});

describe("eventMessage", () => {
  const name = "the Evil Pumpkin";

  test("announces the boss", () => {
    expect(eventMessage(name)).toBe("The Evil Pumpkin has appeared!");
  });

  test("announces the reward of a defeated boss", () => {
    expect(eventMessage(name, { event: 0, defeated: true, souls: 42 })).toBe(
      "The Evil Pumpkin was destroyed! +42 souls",
    );
    expect(eventMessage(name, { event: 0, defeated: true, souls: 0 })).toBe(
      "The Evil Pumpkin was destroyed!",
    );
  });

  test("announces a boss that leaves", () => {
    expect(eventMessage(name, { event: 0, defeated: false, souls: 0 })).toBe(
      "The Evil Pumpkin has vanished.",
    );
  });
});
