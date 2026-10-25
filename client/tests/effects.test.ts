import { describe, expect, test } from "vitest";
import {
  EntityFlag,
  EntityKind,
  type ClientConfig,
  type SnapshotEntity,
} from "@horde/shared";
import { fusedUnits, ringShape } from "../src/game/effects.js";

const style = { color: "#5fd45a", radius: 4, width: 0.2, durationMs: 1000 };

const unit = (id: number, type: number, flags: number): SnapshotEntity => ({
  id,
  kind: EntityKind.Unit,
  type,
  army: 1,
  flags,
  hp: 255,
  x: id,
  y: 0,
});

const units = [
  { strength: 1 },
  { strength: 2 },
] as ClientConfig["content"]["units"];

describe("ringShape", () => {
  test("grows and fades over its duration", () => {
    expect(ringShape(style, 0)).toEqual({ radius: 0, alpha: 1 });
    expect(ringShape(style, 250)).toEqual({ radius: 2, alpha: 0.75 });
    expect(ringShape(style, 1000)).toBeUndefined();
  });
});

describe("fusedUnits", () => {
  test("reports evolved units once, when they start rising", () => {
    const seen = new Set<number>();
    const frame = [
      unit(1, 1, EntityFlag.Rising),
      unit(2, 0, EntityFlag.Rising),
      unit(3, 1, 0),
    ];
    expect(fusedUnits(frame, units, seen).map((u) => u.id)).toEqual([1]);
    expect(fusedUnits(frame, units, seen)).toEqual([]);
  });
});
