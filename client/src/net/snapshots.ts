import type { SnapshotEntity, SnapshotUpdate } from "@horde/shared";

export interface SnapshotChanges {
  entities: SnapshotEntity[];
  updates: SnapshotUpdate[];
  removed: number[];
}

export class SnapshotState {
  readonly #entities = new Map<number, SnapshotEntity>();

  apply(changes: SnapshotChanges): SnapshotEntity[] {
    for (const id of changes.removed) {
      this.#entities.delete(id);
    }
    for (const entity of changes.entities) {
      this.#entities.set(entity.id, entity);
    }
    for (const update of changes.updates) {
      const entity = this.#entities.get(update.id);
      if (entity !== undefined) {
        this.#entities.set(update.id, { ...entity, ...update });
      }
    }
    return [...this.#entities.values()];
  }
}
