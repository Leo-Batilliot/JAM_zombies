import { describe, expect, test } from "vitest";
import { EntityKind, type SnapshotEntity } from "@horde/shared";
import { entityLights, SlowFrames } from "../src/game/night.js";

const entity = (kind: EntityKind, x: number, y: number): SnapshotEntity =>
  ({ id: x, kind, x, y }) as SnapshotEntity;

describe("entityLights", () => {
  test("lights the entity kinds that have a radius", () => {
    const lights = entityLights(
      [
        entity(EntityKind.Mage, 1, 2),
        entity(EntityKind.Unit, 3, 4),
        entity(EntityKind.Camp, 5, 6),
      ],
      { Mage: 9, Camp: 7 },
    );
    expect(lights).toEqual([
      { x: 1, y: 2, radius: 9 },
      { x: 5, y: 6, radius: 7 },
    ]);
  });
});

describe("SlowFrames", () => {
  const settings = {
    color: "#000000",
    alpha: 0.5,
    resolution: 0.5,
    lights: {},
    minFps: 30,
    slowSec: 2,
  };

  test("degrades after a long run of slow frames, and stays degraded", () => {
    const slow = new SlowFrames(() => settings);
    slow.record(20, 1500);
    expect(slow.degraded).toBe(false);
    slow.record(20, 600);
    expect(slow.degraded).toBe(true);
    slow.record(60, 16);
    expect(slow.degraded).toBe(true);
  });

  test("forgets slow frames once the game runs fast again", () => {
    const slow = new SlowFrames(() => settings);
    slow.record(20, 1500);
    slow.record(60, 16);
    slow.record(20, 1500);
    expect(slow.degraded).toBe(false);
  });
});
