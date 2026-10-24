import { EntityKind, type Config } from "@horde/shared";
import { SpatialGrid } from "./grid.js";

export interface Mage {
  id: number;
  kind: EntityKind.Mage;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

export type Entity = Mage;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export class World {
  tick = 0;
  readonly entities = new Map<number, Entity>();
  readonly grid: SpatialGrid;
  #nextId = 1;

  constructor(
    readonly config: Config,
    readonly random: () => number = Math.random,
  ) {
    this.grid = new SpatialGrid(config.world.gridCellSize);
  }

  clampX(x: number): number {
    return clamp(x, 0, this.config.world.width);
  }

  clampY(y: number): number {
    return clamp(y, 0, this.config.world.height);
  }

  #randomCoordinate(size: number): number {
    const margin = Math.min(this.config.world.spawnMargin, size / 2);
    return margin + this.random() * (size - 2 * margin);
  }

  addMage(x: number, y: number): Mage {
    const mage: Mage = {
      id: this.#nextId++,
      kind: EntityKind.Mage,
      x: this.clampX(x),
      y: this.clampY(y),
      targetX: this.clampX(x),
      targetY: this.clampY(y),
    };
    this.entities.set(mage.id, mage);
    this.grid.insert(mage.id, mage.x, mage.y);
    return mage;
  }

  spawnMage(): Mage {
    return this.addMage(
      this.#randomCoordinate(this.config.world.width),
      this.#randomCoordinate(this.config.world.height),
    );
  }

  setPosition(entity: Entity, x: number, y: number): void {
    entity.x = this.clampX(x);
    entity.y = this.clampY(y);
    this.grid.update(entity.id, entity.x, entity.y);
  }

  remove(id: number): void {
    this.entities.delete(id);
    this.grid.remove(id);
  }
}
