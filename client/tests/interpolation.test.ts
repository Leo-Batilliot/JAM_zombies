import { describe, expect, test } from "vitest";
import { EntityKind } from "@horde/shared";
import { SnapshotBuffer } from "../src/game/interpolation.js";

const settings = { tickRate: 10, interpolationDelayMs: 100 };
const mage = (id: number, x: number) => ({
  id,
  kind: EntityKind.Mage,
  type: 0,
  army: 1,
  flags: 0,
  x,
  y: 0,
});

describe("SnapshotBuffer", () => {
  test("is empty before the first snapshot", () => {
    expect(new SnapshotBuffer(settings).sample(0)).toEqual([]);
  });

  test("interpolates between two snapshots with the delay", () => {
    const buffer = new SnapshotBuffer(settings);
    buffer.push(0, [mage(1, 0)], 1000);
    buffer.push(1, [mage(1, 10)], 1100);
    expect(buffer.sample(1150)[0]?.x).toBeCloseTo(5);
  });

  test("holds the last position when snapshots stop", () => {
    const buffer = new SnapshotBuffer(settings);
    buffer.push(0, [mage(1, 0)], 1000);
    buffer.push(1, [mage(1, 10)], 1100);
    expect(buffer.sample(5000)[0]?.x).toBe(10);
  });

  test("ignores late arrivals when estimating the clock", () => {
    const buffer = new SnapshotBuffer(settings);
    buffer.push(0, [mage(1, 0)], 1000);
    buffer.push(1, [mage(1, 10)], 1180);
    expect(buffer.sample(1150)[0]?.x).toBeCloseTo(5);
  });

  test("shows new entities and drops those that left", () => {
    const buffer = new SnapshotBuffer(settings);
    buffer.push(0, [mage(1, 0)], 1000);
    buffer.push(1, [mage(2, 10)], 1100);
    expect(buffer.sample(1150).map((entity) => entity.id)).toEqual([2]);
  });
});
