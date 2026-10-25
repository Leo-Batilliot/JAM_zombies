import { Graphics } from "pixi.js";
import {
  EntityKind,
  flagLevel,
  maxFlagLevel,
  type ClientConfig,
  type SnapshotEntity,
} from "@horde/shared";

const markAlpha = 0.12;
const fillAlpha = 0.35;
const blastAlpha = 0.6;
const edgeWidth = 0.25;

export const bombingCountdown = (flags: number): number =>
  flagLevel(flags) / (maxFlagLevel - 1);

export const isBlast = (flags: number): boolean =>
  flagLevel(flags) === maxFlagLevel;

const parseColor = (color: string): number =>
  Number.parseInt(color.slice(1), 16);

export class BombingLayer {
  readonly graphics = new Graphics();

  update(entities: SnapshotEntity[], config: ClientConfig): void {
    const { radius } = config.world.bombings;
    const mark = parseColor(config.client.bombingColors.mark);
    const blast = parseColor(config.client.bombingColors.blast);
    this.graphics.clear();
    for (const entity of entities) {
      if (entity.kind !== EntityKind.Bombing) {
        continue;
      }
      if (isBlast(entity.flags)) {
        this.graphics
          .circle(entity.x, entity.y, radius)
          .fill({ color: blast, alpha: blastAlpha });
        continue;
      }
      this.graphics
        .circle(entity.x, entity.y, radius)
        .fill({ color: mark, alpha: markAlpha })
        .stroke({ color: mark, width: edgeWidth })
        .circle(
          entity.x,
          entity.y,
          radius * Math.min(bombingCountdown(entity.flags), 1),
        )
        .fill({ color: mark, alpha: fillAlpha });
    }
  }
}
