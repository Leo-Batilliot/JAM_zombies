import { Container, Graphics, Text } from "pixi.js";
import {
  EntityKind,
  flagLevel,
  maxFlagLevel,
  type ClientConfig,
  type CrossStrength,
  type SnapshotEntity,
} from "@horde/shared";

const readyColor = 0xf6d660;
const rechargingColor = 0x8a8a9a;
const dangerColor = 0xe0605a;
const strokeWidth = 0.2;
const fillAlpha = 0.08;
const labelSize = 14;
const labelGap = 0.6;

export const crossLabel = (strength: number, threshold: number): string =>
  `${String(strength)} / ${String(threshold)}`;

export class CrossLayer {
  readonly container = new Container();
  readonly #zones = new Graphics();
  readonly #labels = new Map<number, Text>();
  readonly #seen = new Set<number>();

  constructor() {
    this.container.addChild(this.#zones);
  }

  #label(id: number): Text {
    let label = this.#labels.get(id);
    if (label === undefined) {
      label = new Text({
        text: "",
        style: {
          fontFamily: "system-ui, sans-serif",
          fontSize: labelSize,
          fontWeight: "bold",
          fill: 0xffffff,
          stroke: { color: 0x000000, width: 3 },
        },
      });
      label.anchor.set(0.5, 1);
      this.#labels.set(id, label);
      this.container.addChild(label);
    }
    return label;
  }

  update(
    entities: SnapshotEntity[],
    strengths: CrossStrength[],
    settings: ClientConfig["world"]["crosses"],
    scale: number,
  ): void {
    const { radius, threshold } = settings;
    this.#zones.clear();
    this.#seen.clear();
    for (const cross of entities) {
      if (cross.kind !== EntityKind.Cross) {
        continue;
      }
      this.#seen.add(cross.id);
      const charge = flagLevel(cross.flags) / maxFlagLevel;
      const ready = charge >= 1;
      const color = ready ? readyColor : rechargingColor;
      this.#zones
        .circle(cross.x, cross.y, radius)
        .fill({ color, alpha: fillAlpha })
        .stroke({ color, width: strokeWidth, alpha: ready ? 0.9 : 0.5 });
      if (!ready) {
        this.#zones
          .moveTo(cross.x, cross.y - radius)
          .arc(
            cross.x,
            cross.y,
            radius,
            -Math.PI / 2,
            -Math.PI / 2 + charge * 2 * Math.PI,
          )
          .stroke({ color: readyColor, width: strokeWidth, alpha: 0.9 });
      }
      const strength =
        strengths.find((entry) => entry.id === cross.id)?.strength ?? 0;
      const label = this.#label(cross.id);
      label.text = crossLabel(strength, threshold);
      label.style.fill = strength >= threshold ? dangerColor : 0xffffff;
      label.scale.set(1 / scale);
      label.position.set(cross.x, cross.y - radius - labelGap);
    }
    for (const [id, label] of this.#labels) {
      if (!this.#seen.has(id)) {
        label.destroy();
        this.#labels.delete(id);
      }
    }
  }
}
