import { describe, expect, test } from "vitest";
import {
  EntityFlag,
  EntityKind,
  levelFlags,
  maxFlagLevel,
  neutralArmy,
  type SnapshotEntity,
} from "@horde/shared";
import { CueTracker } from "../src/audio/cues.js";
import { EffectLimiter } from "../src/audio/engine.js";
import { musicMix } from "../src/audio/music.js";

const view = { minX: 0, minY: 0, maxX: 20, maxY: 20 };

const entity = (
  id: number,
  overrides: Partial<SnapshotEntity> = {},
): SnapshotEntity => ({
  id,
  kind: EntityKind.Unit,
  type: 0,
  army: 1,
  flags: 0,
  hp: 255,
  x: 10,
  y: 10,
  ...overrides,
});

describe("musicMix", () => {
  test("plays exploration alone out of combat", () => {
    expect(musicMix(0, 30, false)).toEqual({
      exploration: 1,
      combat: 0,
      boss: 0,
    });
  });

  test("raises the combat layer with the fighting units", () => {
    expect(musicMix(15, 30, false).combat).toBe(0.5);
    expect(musicMix(90, 30, false).combat).toBe(1);
  });

  test("replaces exploration with the boss theme", () => {
    expect(musicMix(0, 30, true)).toEqual({
      exploration: 0,
      combat: 0,
      boss: 1,
    });
  });
});

describe("EffectLimiter", () => {
  test("waits for the gap before replaying an effect", () => {
    const limiter = new EffectLimiter();
    expect(limiter.allow("hit", 100, 0)).toBe(true);
    expect(limiter.allow("hit", 100, 50)).toBe(false);
    expect(limiter.allow("death", 100, 50)).toBe(true);
    expect(limiter.allow("hit", 100, 120)).toBe(true);
  });
});

describe("CueTracker", () => {
  test("counts visible fighting bodies", () => {
    const cues = new CueTracker().read(
      [
        entity(1, { flags: EntityFlag.Fighting }),
        entity(2, { flags: EntityFlag.Fighting, x: 50 }),
        entity(3),
        entity(4, {
          kind: EntityKind.Npc,
          army: neutralArmy,
          flags: EntityFlag.Fighting,
        }),
      ],
      view,
    );
    expect(cues.fighting).toBe(2);
  });

  test("reports a visible body that disappears as a death", () => {
    const tracker = new CueTracker();
    tracker.read([entity(1), entity(2, { x: 50 })], view);
    expect(tracker.read([], view).deaths).toBe(1);
  });

  test("ignores a body that only leaves the view", () => {
    const tracker = new CueTracker();
    tracker.read([entity(1)], view);
    expect(tracker.read([entity(1, { x: 25 })], view).deaths).toBe(0);
  });

  test("reports each rise once", () => {
    const tracker = new CueTracker();
    const rising = entity(1, { flags: EntityFlag.Rising });
    expect(tracker.read([rising], view).rises).toBe(1);
    expect(tracker.read([rising], view).rises).toBe(0);
  });

  test("reports each visible blast once, not the countdown", () => {
    const tracker = new CueTracker();
    const bombing = {
      kind: EntityKind.Bombing,
      army: neutralArmy,
      flags: levelFlags(3),
    };
    expect(tracker.read([entity(1, bombing)], view).blasts).toBe(0);
    const blast = entity(1, { ...bombing, flags: levelFlags(maxFlagLevel) });
    expect(tracker.read([blast], view).blasts).toBe(1);
    expect(tracker.read([blast], view).blasts).toBe(0);
    const far = entity(2, {
      ...bombing,
      flags: levelFlags(maxFlagLevel),
      x: 50,
    });
    expect(tracker.read([far], view).blasts).toBe(0);
  });
});
