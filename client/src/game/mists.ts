import { Graphics } from "pixi.js";
import {
  EntityKind,
  type ClientConfig,
  type SnapshotEntity,
} from "@horde/shared";

const fillAlpha = 0.16;
const edgeAlpha = 0.35;
const edgeWidth = 0.3;
const fallbackColor = "#ffffff";

export const mistColor = (colors: Record<string, string>, id: string): number =>
  Number.parseInt((colors[id] ?? fallbackColor).slice(1), 16);

export class MistLayer {
  readonly graphics = new Graphics();

  update(entities: SnapshotEntity[], config: ClientConfig): void {
    this.graphics.clear();
    for (const entity of entities) {
      const mist =
        entity.kind === EntityKind.Mist
          ? config.content.mists[entity.type]
          : undefined;
      if (mist === undefined) {
        continue;
      }
      const color = mistColor(config.client.mistColors, mist.id);
      this.graphics
        .circle(entity.x, entity.y, mist.radius)
        .fill({ color, alpha: fillAlpha })
        .stroke({ color, width: edgeWidth, alpha: edgeAlpha });
    }
  }
}
