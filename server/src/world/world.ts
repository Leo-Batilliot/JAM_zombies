import { EntityKind, type Config, type Registries } from "@horde/shared";
import { SpatialGrid } from "./grid.js";

export interface Army {
  slot: number;
  name: string;
  mage: Mage;
  units: Set<Unit>;
  corpses: Set<Corpse>;
  souls: number;
  level: number;
  focusId: number | undefined;
  alive: boolean;
  respawnAt: number;
  deaths: number;
  killerName: string;
  search: Search | undefined;
}

export interface Search {
  pointId: number;
  progress: number;
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
  hp: number;
  hitAt: number;
}

export interface Unit {
  id: number;
  kind: EntityKind.Unit;
  type: string;
  army: Army;
  x: number;
  y: number;
  hp: number;
  targetId: number | undefined;
  retargetAt: number;
  cooldown: number;
  raisedAt: number;
  fighting: boolean;
}

export interface NpcGroup {
  population: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  wanderAt: number;
  members: Set<Npc>;
}

export interface Npc {
  id: number;
  kind: EntityKind.Npc;
  type: string;
  group: NpcGroup;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  hp: number;
}

export interface Corpse {
  id: number;
  kind: EntityKind.Corpse;
  type: string;
  owner: Army;
  killer: Army | undefined;
  diedAt: number;
  x: number;
  y: number;
}

export interface PointOfInterest {
  id: number;
  kind: EntityKind.PointOfInterest;
  type: string;
  x: number;
  y: number;
  expiresAt: number;
  searchedBy: Set<Army>;
  corpses: string[];
}

export type Entity = Mage | Unit | Npc | Corpse | PointOfInterest;
export type Body = Mage | Unit | Npc;

const maxArmySlot = 0xff;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const isBody = (entity: Entity): entity is Body =>
  entity.kind === EntityKind.Mage ||
  entity.kind === EntityKind.Unit ||
  entity.kind === EntityKind.Npc;

export const armyOf = (entity: Entity): Army | undefined =>
  entity.kind === EntityKind.Mage || entity.kind === EntityKind.Unit
    ? entity.army
    : undefined;

export class World {
  tick = 0;
  time = 0;
  readonly entities = new Map<number, Entity>();
  readonly armies = new Map<number, Army>();
  readonly npcGroups = new Set<NpcGroup>();
  readonly points = new Set<PointOfInterest>();
  readonly populationSpawnAt = new Map<number, number>();
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

  randomNear(x: number, y: number, radius: number): { x: number; y: number } {
    const angle = this.random() * 2 * Math.PI;
    const distance = Math.sqrt(this.random()) * radius;
    return {
      x: this.clampX(x + Math.cos(angle) * distance),
      y: this.clampY(y + Math.sin(angle) * distance),
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
    const army = {
      slot: this.#freeSlot(),
      name,
      units: new Set(),
      corpses: new Set(),
      souls: 0,
      level: 1,
      focusId: undefined,
      alive: true,
      respawnAt: 0,
      deaths: 0,
      killerName: "",
      search: undefined,
    } as unknown as Army;
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
      hp: this.config.gameplay.mage.baseHp,
      hitAt: -Infinity,
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
      hp: this.registries.units.get(type).hp,
      targetId: undefined,
      retargetAt: this.time,
      cooldown: 0,
      raisedAt: -Infinity,
      fighting: false,
    };
    army.units.add(unit);
    this.#add(unit);
    return unit;
  }

  addNpcGroup(population: number, x: number, y: number): NpcGroup {
    const group: NpcGroup = {
      population,
      x,
      y,
      targetX: x,
      targetY: y,
      wanderAt: this.time,
      members: new Set(),
    };
    this.npcGroups.add(group);
    return group;
  }

  addNpc(group: NpcGroup, type: string, offsetX: number, offsetY: number): Npc {
    const npc: Npc = {
      id: this.#nextId++,
      kind: EntityKind.Npc,
      type,
      group,
      offsetX,
      offsetY,
      x: this.clampX(group.x + offsetX),
      y: this.clampY(group.y + offsetY),
      hp: this.registries.npcs.get(type).hp,
    };
    group.members.add(npc);
    this.#add(npc);
    return npc;
  }

  addCorpse(
    type: string,
    owner: Army,
    killer: Army | undefined,
    x: number,
    y: number,
  ): Corpse {
    const corpse: Corpse = {
      id: this.#nextId++,
      kind: EntityKind.Corpse,
      type,
      owner,
      killer,
      diedAt: this.time,
      x: this.clampX(x),
      y: this.clampY(y),
    };
    owner.corpses.add(corpse);
    this.#add(corpse);
    return corpse;
  }

  addPointOfInterest(
    type: string,
    x: number,
    y: number,
    lifetimeSec: number,
  ): PointOfInterest {
    const point: PointOfInterest = {
      id: this.#nextId++,
      kind: EntityKind.PointOfInterest,
      type,
      x: this.clampX(x),
      y: this.clampY(y),
      expiresAt: this.time + lifetimeSec,
      searchedBy: new Set(),
      corpses: [],
    };
    this.points.add(point);
    this.#add(point);
    return point;
  }

  clearArmy(army: Army): void {
    for (const unit of army.units) {
      this.remove(unit.id);
    }
    for (const corpse of army.corpses) {
      this.remove(corpse.id);
    }
    army.units.clear();
    army.corpses.clear();
    this.remove(army.mage.id);
  }

  placeMage(army: Army, x: number, y: number): void {
    const { mage } = army;
    mage.x = this.clampX(x);
    mage.y = this.clampY(y);
    mage.targetX = mage.x;
    mage.targetY = mage.y;
    this.#add(mage);
  }

  removeEntity(entity: Entity): void {
    switch (entity.kind) {
      case EntityKind.Unit:
        entity.army.units.delete(entity);
        break;
      case EntityKind.Npc:
        entity.group.members.delete(entity);
        if (entity.group.members.size === 0) {
          this.npcGroups.delete(entity.group);
        }
        break;
      case EntityKind.Corpse:
        entity.owner.corpses.delete(entity);
        break;
      case EntityKind.PointOfInterest:
        this.points.delete(entity);
        break;
      case EntityKind.Mage:
        break;
    }
    this.remove(entity.id);
  }

  removeArmy(army: Army): void {
    this.clearArmy(army);
    for (const point of this.points) {
      point.searchedBy.delete(army);
    }
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
