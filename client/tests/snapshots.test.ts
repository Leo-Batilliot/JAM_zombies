import { describe, expect, test } from "vitest";
import { EntityKind, type SnapshotEntity } from "@horde/shared";
import { SnapshotState } from "../src/net/snapshots.js";

const unit = (id: number): SnapshotEntity => ({
  id,
  kind: EntityKind.Unit,
  type: 0,
  army: 1,
  flags: 0,
  hp: 255,
  x: 1,
  y: 2,
});

describe("SnapshotState", () => {
  test("rebuilds the full list from new entities, updates and removals", () => {
    const state = new SnapshotState();
    expect(
      state.apply({ entities: [unit(1), unit(2)], updates: [], removed: [] }),
    ).toHaveLength(2);
    const next = state.apply({
      entities: [],
      updates: [{ id: 1, flags: 4, hp: 100, x: 5, y: 6 }],
      removed: [2],
    });
    expect(next).toEqual([{ ...unit(1), flags: 4, hp: 100, x: 5, y: 6 }]);
  });

  test("keeps entities that did not change", () => {
    const state = new SnapshotState();
    state.apply({ entities: [unit(1)], updates: [], removed: [] });
    expect(state.apply({ entities: [], updates: [], removed: [] })).toEqual([
      unit(1),
    ]);
  });
});
