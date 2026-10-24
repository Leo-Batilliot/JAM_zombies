import {
  quantizeX,
  type EntityKind,
  quantizeY,
  type Bounds,
  type SnapshotEntity,
  type SnapshotUpdate,
} from "@horde/shared";

interface Sent {
  kind: EntityKind;
  type: number;
  army: number;
  flags: number;
  x: number;
  y: number;
}

export interface Delta {
  entities: SnapshotEntity[];
  updates: SnapshotUpdate[];
  removed: number[];
}

export class SnapshotDelta {
  readonly #sent = new Map<number, Sent>();
  readonly #seen = new Set<number>();

  next(visible: SnapshotEntity[], bounds: Bounds): Delta {
    const delta: Delta = { entities: [], updates: [], removed: [] };
    this.#seen.clear();
    for (const entity of visible) {
      this.#seen.add(entity.id);
      const x = quantizeX(entity.x, bounds);
      const y = quantizeY(entity.y, bounds);
      const sent = this.#sent.get(entity.id);
      if (
        sent === undefined ||
        sent.kind !== entity.kind ||
        sent.type !== entity.type ||
        sent.army !== entity.army
      ) {
        delta.entities.push(entity);
      } else if (sent.flags !== entity.flags || sent.x !== x || sent.y !== y) {
        delta.updates.push({
          id: entity.id,
          flags: entity.flags,
          x: entity.x,
          y: entity.y,
        });
      } else {
        continue;
      }
      this.#sent.set(entity.id, {
        kind: entity.kind,
        type: entity.type,
        army: entity.army,
        flags: entity.flags,
        x,
        y,
      });
    }
    for (const id of this.#sent.keys()) {
      if (!this.#seen.has(id)) {
        delta.removed.push(id);
        this.#sent.delete(id);
      }
    }
    return delta;
  }
}
