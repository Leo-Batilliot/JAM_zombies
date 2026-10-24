import { EntityKind, type Config, type Registries } from "@horde/shared";
import { SpatialGrid } from "./grid.js";

export interface Army {
  slot: number;
  name: string;
  mage: Mage;
  units: Set<Unit>;
}

export interface Mage {
  id: number;
  kind: EntityKind.Mage;
  army: Army;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  facingX: number;
  facingY: number;
}

export interface Unit {
  id: number;
  kind: EntityKind.Unit;
  type: string;
  army: Army;
  x: number;
  y: number;
}

export type Entity = Mage | Unit;

const maxArmySlot = 0xff;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export class World {
  tick = 0;
  time = 0;
  readonly entities = new Map<number, Entity>();
  readonly armies = new Map<number, Army>();
  readonly grid: SpatialGrid;
  #nextId = 1;

  constructor(
    readonly config: Config,
    readonly registries: Registries,
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

  randomPoint(): { x: number; y: number } {
    return {
      x: this.#randomCoordinate(this.config.world.width),
      y: this.#randomCoordinate(this.config.world.height),
    };
  }

  #freeSlot(): number {
    for (let slot = 1; slot <= maxArmySlot; slot++) {
      if (!this.armies.has(slot)) {
        return slot;
      }
    }
    throw new Error("No free army slot");
  }

  #add(entity: Entity): void {
    this.entities.set(entity.id, entity);
    this.grid.insert(entity.id, entity.x, entity.y);
  }

  addArmy(name: string, x: number, y: number): Army {
    const army = { slot: this.#freeSlot(), name, units: new Set() } as Army;
    army.mage = {
      id: this.#nextId++,
      kind: EntityKind.Mage,
      army,
      x: this.clampX(x),
      y: this.clampY(y),
      targetX: this.clampX(x),
      targetY: this.clampY(y),
      facingX: 0,
      facingY: 1,
    };
    this.armies.set(army.slot, army);
    this.#add(army.mage);
    return army;
  }

  addUnit(army: Army, type: string, x: number, y: number): Unit {
    const unit: Unit = {
      id: this.#nextId++,
      kind: EntityKind.Unit,
      type,
      army,
      x: this.clampX(x),
      y: this.clampY(y),
    };
    army.units.add(unit);
    this.#add(unit);
    return unit;
  }

  removeUnit(unit: Unit): void {
    unit.army.units.delete(unit);
    this.remove(unit.id);
  }

  removeArmy(army: Army): void {
    for (const unit of army.units) {
      this.remove(unit.id);
    }
    army.units.clear();
    this.remove(army.mage.id);
    this.armies.delete(army.slot);
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
