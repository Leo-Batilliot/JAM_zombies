import { describe, expect, test } from "vitest";
import { EntityKind, type SnapshotEntity } from "@horde/shared";
import { SnapshotDelta } from "../../src/net/delta.js";

const bounds = { width: 400, height: 400 };

const unit = (overrides: Partial<SnapshotEntity> = {}): SnapshotEntity => ({
  id: 1,
  kind: EntityKind.Unit,
  type: 0,
  army: 2,
  flags: 0,
  x: 10,
  y: 20,
  ...overrides,
});

describe("SnapshotDelta", () => {
  test("sends new entities in full, then nothing while they stay still", () => {
    const delta = new SnapshotDelta();
    expect(delta.next([unit()], bounds).entities).toEqual([unit()]);
    expect(delta.next([unit()], bounds)).toEqual({
      entities: [],
      updates: [],
      removed: [],
    });
  });

  test("sends only position and flags when they change", () => {
    const delta = new SnapshotDelta();
    delta.next([unit()], bounds);
    expect(delta.next([unit({ x: 11, flags: 1 })], bounds).updates).toEqual([
      { id: 1, flags: 1, x: 11, y: 20 },
    ]);
  });

  test("ignores moves smaller than the quantization step", () => {
    const delta = new SnapshotDelta();
    delta.next([unit()], bounds);
    expect(delta.next([unit({ x: 10.0001 })], bounds).updates).toEqual([]);
  });

  test("sends an entity in full again when it changes army", () => {
    const delta = new SnapshotDelta();
    delta.next([unit()], bounds);
    expect(delta.next([unit({ army: 5 })], bounds).entities).toEqual([
      unit({ army: 5 }),
    ]);
  });

  test("lists entities that left the view", () => {
    const delta = new SnapshotDelta();
    delta.next([unit(), unit({ id: 2 })], bounds);
    expect(delta.next([unit({ id: 2 })], bounds).removed).toEqual([1]);
    expect(delta.next([unit({ id: 1 })], bounds).entities).toEqual([unit()]);
  });
});
