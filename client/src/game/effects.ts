import { Graphics } from "pixi.js";
import {
  EntityFlag,
  EntityKind,
  type ClientConfig,
  type SnapshotEntity,
} from "@horde/shared";

type RingStyle = ClientConfig["client"]["effects"]["fusion"];

interface Ring {
  x: number;
  y: number;
  startMs: number;
  style: RingStyle;
}

export const ringShape = (
  style: RingStyle,
  elapsedMs: number,
): { radius: number; alpha: number } | undefined => {
  const progress = elapsedMs / style.durationMs;
  if (progress < 0 || progress >= 1) {
    return undefined;
  }
  return { radius: style.radius * Math.sqrt(progress), alpha: 1 - progress };
};

export const fusedUnits = (
  frame: SnapshotEntity[],
  units: ClientConfig["content"]["units"],
  seen: Set<number>,
): SnapshotEntity[] => {
  const fused: SnapshotEntity[] = [];
  const rising = new Set<number>();
  for (const entity of frame) {
    if (
      entity.kind !== EntityKind.Unit ||
      (entity.flags & EntityFlag.Rising) === 0
    ) {
      continue;
    }
    rising.add(entity.id);
    if (!seen.has(entity.id) && (units[entity.type]?.strength ?? 1) > 1) {
      fused.push(entity);
    }
  }
  seen.clear();
  rising.forEach((id) => seen.add(id));
  return fused;
};

export class EffectLayer {
  readonly graphics = new Graphics();
  readonly #rising = new Set<number>();
  #rings: Ring[] = [];
  #level: number | undefined;

  burst(x: number, y: number, style: RingStyle, now: number): void {
    this.#rings.push({ x, y, startMs: now, style });
  }

  watch(
    frame: SnapshotEntity[],
    config: ClientConfig,
    self: SnapshotEntity | undefined,
    level: number | undefined,
    now: number,
  ): void {
    const { fusion, levelUp } = config.client.effects;
    for (const unit of fusedUnits(frame, config.content.units, this.#rising)) {
      this.burst(unit.x, unit.y, fusion, now);
    }
    if (
      self !== undefined &&
      level !== undefined &&
      this.#level !== undefined &&
      level > this.#level
    ) {
      this.burst(self.x, self.y, levelUp, now);
    }
    this.#level = level;
  }

  update(now: number): void {
    this.graphics.clear();
    this.#rings = this.#rings.filter((ring) => {
      const shape = ringShape(ring.style, now - ring.startMs);
      if (shape === undefined) {
        return false;
      }
      this.graphics.circle(ring.x, ring.y, shape.radius).stroke({
        color: ring.style.color,
        width: ring.style.width,
        alpha: shape.alpha,
      });
      return true;
    });
  }
}
