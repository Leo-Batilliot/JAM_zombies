import type { SnapshotEntity } from "@horde/shared";

interface TimedSnapshot {
  time: number;
  entities: Map<number, SnapshotEntity>;
}

export interface InterpolationSettings {
  tickRate: number;
  interpolationDelayMs: number;
}

export class SnapshotBuffer {
  #snapshots: TimedSnapshot[] = [];
  #clockOffset: number | undefined;

  constructor(readonly settings: InterpolationSettings) {}

  push(tick: number, entities: SnapshotEntity[], now: number): void {
    const time = (tick * 1000) / this.settings.tickRate;
    const offset = now - time;
    this.#clockOffset = Math.min(this.#clockOffset ?? offset, offset);
    const last = this.#snapshots.at(-1);
    if (last !== undefined && time <= last.time) {
      return;
    }
    this.#snapshots.push({
      time,
      entities: new Map(entities.map((entity) => [entity.id, entity])),
    });
  }

  sample(now: number): SnapshotEntity[] {
    if (this.#clockOffset === undefined) {
      return [];
    }
    const renderTime =
      now - this.#clockOffset - this.settings.interpolationDelayMs;
    while (
      this.#snapshots.length > 2 &&
      (this.#snapshots[1]?.time ?? Infinity) <= renderTime
    ) {
      this.#snapshots.shift();
    }
    const [from, to] = this.#snapshots;
    if (from === undefined) {
      return [];
    }
    if (to === undefined || renderTime <= from.time) {
      return [...from.entities.values()];
    }
    if (renderTime >= to.time) {
      return [...to.entities.values()];
    }
    const ratio = (renderTime - from.time) / (to.time - from.time);
    return [...to.entities.values()].map((entity) => {
      const previous = from.entities.get(entity.id);
      if (previous === undefined) {
        return entity;
      }
      return {
        ...entity,
        x: previous.x + (entity.x - previous.x) * ratio,
        y: previous.y + (entity.y - previous.y) * ratio,
      };
    });
  }
}
