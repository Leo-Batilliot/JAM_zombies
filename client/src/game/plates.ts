import { Container, Text, type TextStyleOptions } from "pixi.js";
import {
  EntityKind,
  type ClientConfig,
  type LeaderboardEntry,
  type SnapshotEntity,
} from "@horde/shared";
import { armyColor } from "./sprites.js";

const powerColor = 0xece3f5;

export const plateText = (entry: LeaderboardEntry): string =>
  `${String(entry.strength)} / ${String(entry.potential)}`;

class Plate {
  readonly container = new Container();
  readonly name: Text;
  readonly power: Text;

  constructor(color: number, fontSize: number) {
    const style: TextStyleOptions = {
      fontFamily: "system-ui, sans-serif",
      fontSize,
      fontWeight: "bold",
      stroke: { color: 0x000000, width: 3 },
    };
    this.name = new Text({
      text: "",
      anchor: { x: 0.5, y: 1 },
      style: { ...style, fill: color },
    });
    this.power = new Text({
      text: "",
      anchor: { x: 0.5, y: 0 },
      style: { ...style, fill: powerColor },
    });
    this.container.addChild(this.name, this.power);
  }

  set(entry: LeaderboardEntry): void {
    if (this.name.text !== entry.name) {
      this.name.text = entry.name;
    }
    const power = plateText(entry);
    if (this.power.text !== power) {
      this.power.text = power;
    }
  }
}

export class PlateLayer {
  readonly container = new Container();
  readonly #plates = new Map<number, Plate>();
  #entries = new Map<number, LeaderboardEntry>();

  setEntries(entries: LeaderboardEntry[]): void {
    this.#entries = new Map(entries.map((entry) => [entry.army, entry]));
  }

  update(
    frame: SnapshotEntity[],
    ownArmy: number | undefined,
    config: ClientConfig,
  ): void {
    const { plates, pixelsPerMeter, armyColors } = config.client;
    const seen = new Set<number>();
    for (const entity of frame) {
      const entry = this.#entries.get(entity.army);
      if (
        entity.kind !== EntityKind.Mage ||
        entity.army === ownArmy ||
        entry === undefined
      ) {
        continue;
      }
      seen.add(entity.id);
      let plate = this.#plates.get(entity.id);
      if (plate === undefined) {
        plate = new Plate(armyColor(armyColors, entity.army), plates.fontSize);
        this.#plates.set(entity.id, plate);
        this.container.addChild(plate.container);
      }
      plate.set(entry);
      plate.container.scale.set(1 / pixelsPerMeter);
      plate.container.position.set(
        entity.x,
        entity.y + plates.offsetY / pixelsPerMeter,
      );
    }
    for (const [id, plate] of this.#plates) {
      if (!seen.has(id)) {
        plate.container.destroy({ children: true });
        this.#plates.delete(id);
      }
    }
  }
}
