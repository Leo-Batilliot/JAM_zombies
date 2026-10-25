import {
  EntityKind,
  generateCity,
  streetTag,
  type City,
  type Config,
  type Registries,
  type RunStats,
} from "@horde/shared";
import { SpatialGrid } from "./grid.js";
import { ObstacleGrid } from "./obstacles.js";

export interface Army {
  slot: number;
  name: string;
  skin: string;
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
  bot: Bot | undefined;
  groups: Set<AbandonedGroup>;
  battle: Battle | undefined;
  inventory: string[];
  found: string[];
  formation: string | undefined;
  formationReadyAt: number;
  heading: Direction;
  headingTarget: Direction;
  slots: Map<Unit, SlotOffset>;
  slotLayout: string | undefined;
  pendingLevels: number;
  cards: Card[];
  mutations: Map<string, Mutation>;
  gifts: Map<string, number>;
  spell: string | undefined;
  spellReadyAt: number;
  rally: Rally;
  fusionAt: number;
  run: Run;
  lastRun: RunStats | undefined;
  respawnRequested: boolean;
}

export type Card =
  | { kind: "mutation"; unit: string }
  | { kind: "gift"; gift: string }
  | { kind: "spell"; spell: string };

export interface Rally {
  until: number;
  multiplier: number;
}

export interface Mutation {
  branch: string;
  tier: number;
}

export interface Run {
  startedAt: number;
  maxPower: number;
  infected: number;
  kills: number;
  mageKills: number;
  mutations: string[];
}

export interface Wall {
  npcs: Npc[];
  expiresAt: number;
}

export interface Direction {
  x: number;
  y: number;
}

export interface SlotOffset {
  forward: number;
  right: number;
}

export interface Remains {
  type: string;
  item: string | undefined;
}

export interface AbandonedGroup {
  army: Army;
  units: Set<Unit>;
  corpses: Set<Corpse>;
  anchorX: number;
  anchorY: number;
  engagedAt: number;
}

export interface Force {
  army: Army | undefined;
  bodies: Body[];
  x: number;
  y: number;
  radius: number;
}

export interface Battle {
  engagedAt: number;
  foes: Force[];
  closest: number;
}

export interface Chase {
  prey: Army;
  since: number;
}

export interface Bot {
  thinkAt: number;
  handicap: number;
  lastX: number;
  lastY: number;
  chase: Chase | undefined;
  ignored: Map<Army, number>;
}

export interface Reconnect {
  army: Army;
  expiresAt: number;
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
  hp: number;
  hitAt: number;
  lossBudget: number;
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
  group: AbandonedGroup | undefined;
  returning: boolean;
  item: string | undefined;
  contactAt: number;
}

export interface NpcGroup {
  population: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  wanderAt: number;
  fleeingSince: number | undefined;
  members: Set<Npc>;
}

export interface Npc {
  id: number;
  kind: EntityKind.Npc;
  type: string;
  group: NpcGroup | undefined;
  event: string | undefined;
  camp: Camp | undefined;
  offsetX: number;
  offsetY: number;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  hp: number;
  targetId: number | undefined;
  retargetAt: number;
  cooldown: number;
  fighting: boolean;
}

export interface EventResult {
  defeated: boolean;
  rewards: Map<Army, number>;
}

export interface BossEvent {
  type: string;
  nextAt: number;
  boss: Npc | undefined;
  minions: Set<Npc>;
  endsAt: number;
  summonAt: number;
  contributions: Map<Army, number>;
  result: EventResult | undefined;
}

export interface Corpse {
  id: number;
  kind: EntityKind.Corpse;
  type: string;
  owner: Army;
  killer: Army | undefined;
  group: AbandonedGroup | undefined;
  diedAt: number;
  sacred: boolean;
  item: string | undefined;
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
  corpses: Remains[];
}

export interface Cross {
  id: number;
  kind: EntityKind.Cross;
  x: number;
  y: number;
  expiresAt: number;
  readyAt: number;
  strengths: Map<Army, number>;
}

export interface Projectile {
  id: number;
  kind: EntityKind.Projectile;
  type: string;
  x: number;
  y: number;
  targetId: number;
  damage: number;
  attacker: Army | undefined;
  attackerName: string;
  fromX: number;
  fromY: number;
}

export interface Mist {
  id: number;
  kind: EntityKind.Mist;
  type: string;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  turnAt: number;
  expiresAt: number;
}

export interface Camp {
  id: number;
  kind: EntityKind.Camp;
  x: number;
  y: number;
  expiresAt: number;
  defenders: Set<Npc>;
  marker: number;
}

export interface PlaceState {
  camp: Camp | undefined;
  respawnAt: number;
  mortarAt: number;
  gas: Set<Mist>;
}

export interface Bombing {
  id: number;
  kind: EntityKind.Bombing;
  x: number;
  y: number;
  strikeAt: number;
  struck: boolean;
}

export type Entity =
  | Mage
  | Unit
  | Npc
  | Corpse
  | PointOfInterest
  | Cross
  | Projectile
  | Mist
  | Camp
  | Bombing;
export type Body = Mage | Unit | Npc;

const maxArmySlot = 0xff;
const maxSeed = 0x7fffffff;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const isBody = (entity: Entity): entity is Body =>
  entity.kind === EntityKind.Mage ||
  entity.kind === EntityKind.Unit ||
  entity.kind === EntityKind.Npc;

export class World {
  tick = 0;
  time = 0;
  readonly entities = new Map<number, Entity>();
  readonly armies = new Map<number, Army>();
  readonly npcGroups = new Set<NpcGroup>();
  readonly points = new Set<PointOfInterest>();
  readonly crosses = new Set<Cross>();
  readonly projectiles = new Set<Projectile>();
  readonly mists = new Set<Mist>();
  readonly camps = new Set<Camp>();
  readonly places = new Map<string, PlaceState>();
  readonly abilityAt = new Map<number, number>();
  readonly bombings = new Set<Bombing>();
  readonly walls = new Set<Wall>();
  readonly populationSpawnAt = new Map<number, number>();
  readonly hostiles = new Set<Npc>();
  readonly events = new Map<string, BossEvent>();
  readonly reconnects = new Map<string, Reconnect>();
  readonly grid: SpatialGrid;
  readonly citySeed: number;
  readonly city: City;
  readonly obstacles: ObstacleGrid;
  bombingAt: number;
  #nextId = 1;

  constructor(
    readonly config: Config,
    readonly registries: Registries,
    readonly random: () => number = Math.random,
  ) {
    this.grid = new SpatialGrid(config.world.gridCellSize);
    this.bombingAt = config.world.bombings.firstDelaySec;
    this.citySeed = Math.floor(random() * maxSeed);
    this.city = generateCity(
      config.world.city,
      config.world.width,
      config.world.height,
      this.citySeed,
    );
    this.obstacles = new ObstacleGrid(
      this.city.obstacles,
      config.world.city.cellSize,
    );
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

  #candidate(tags: string[] | undefined): { x: number; y: number } {
    const { street, border, templates } = this.config.world.city;
    const districts = this.city.districts.filter((district) =>
      templates[district.template]?.tags.some((tag) => tags?.includes(tag)),
    );
    const streets = tags?.includes(streetTag) === true && street > 0;
    const choices = districts.length + (streets ? 1 : 0);
    if (tags === undefined || choices === 0) {
      return {
        x: this.#randomCoordinate(this.config.world.width),
        y: this.#randomCoordinate(this.config.world.height),
      };
    }
    const district = districts[Math.floor(this.random() * choices)];
    if (district !== undefined) {
      return {
        x: district.x + this.random() * district.size,
        y: district.y + this.random() * district.size,
      };
    }
    const lines = this.city.districts
      .filter((entry) => entry.column > 0)
      .map((entry) => entry.x - street / 2);
    const line = lines[Math.floor(this.random() * lines.length)] ?? border;
    const along =
      border + this.random() * (this.config.world.height - 2 * border);
    return this.random() < 0.5 ? { x: line, y: along } : { x: along, y: line };
  }

  freePoint(x: number, y: number, radius: number): { x: number; y: number } {
    const { width, height, city } = this.config.world;
    const margin = Math.min(city.border + radius, width / 2, height / 2);
    const inside = {
      x: clamp(x, margin, width - margin),
      y: clamp(y, margin, height - margin),
    };
    const free = this.obstacles.resolve(inside.x, inside.y, radius) ?? inside;
    return {
      x: clamp(free.x, margin, width - margin),
      y: clamp(free.y, margin, height - margin),
    };
  }

  #isSpaced(x: number, y: number): boolean {
    const { spawnSpacing } = this.config.world;
    for (const fixed of [...this.points, ...this.camps, ...this.crosses]) {
      if (Math.hypot(fixed.x - x, fixed.y - y) < spawnSpacing) {
        return false;
      }
    }
    return true;
  }

  randomPoint(tags?: string[]): { x: number; y: number } {
    const { spawnAttempts } = this.config.world;
    const { clearance } = this.config.world.city;
    let point = this.#candidate(tags);
    for (let attempt = 1; attempt < spawnAttempts; attempt++) {
      if (
        this.obstacles.isFree(point.x, point.y, clearance) &&
        this.#isSpaced(point.x, point.y)
      ) {
        return point;
      }
      point = this.#candidate(tags);
    }
    return this.freePoint(point.x, point.y, clearance);
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

  addArmy(
    name: string,
    x: number,
    y: number,
    skin = this.registries.skins.ids()[0] ?? "",
  ): Army {
    const army = {
      slot: this.#freeSlot(),
      name,
      skin,
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
      bot: undefined,
      groups: new Set(),
      battle: undefined,
      inventory: [],
      found: [],
      formation: undefined,
      formationReadyAt: 0,
      heading: { x: 0, y: 1 },
      headingTarget: { x: 0, y: 1 },
      slots: new Map(),
      slotLayout: undefined,
      pendingLevels: 0,
      cards: [],
      mutations: new Map(),
      gifts: new Map(),
      spell: undefined,
      spellReadyAt: 0,
      rally: { until: 0, multiplier: 1 },
      fusionAt: 0,
      run: this.newRun(),
      lastRun: undefined,
      respawnRequested: false,
    } as unknown as Army;
    army.mage = {
      id: this.#nextId++,
      kind: EntityKind.Mage,
      army,
      x: this.clampX(x),
      y: this.clampY(y),
      targetX: this.clampX(x),
      targetY: this.clampY(y),
      hp: this.config.gameplay.mage.baseHp,
      hitAt: -Infinity,
      lossBudget:
        this.config.gameplay.mage.baseHp *
        this.config.gameplay.soulLink.maxLossPerSec,
    };
    this.armies.set(army.slot, army);
    this.#add(army.mage);
    return army;
  }

  newRun(): Run {
    return {
      startedAt: this.time,
      maxPower: 0,
      infected: 0,
      kills: 0,
      mageKills: 0,
      mutations: [],
    };
  }

  unitMaxHp(type: string, item: string | undefined): number {
    const bonus =
      item !== undefined && this.registries.items.has(item)
        ? (this.registries.items.get(item).hp ?? 1)
        : 1;
    return this.registries.units.get(type).hp * bonus;
  }

  addUnit(army: Army, type: string, x: number, y: number, item?: string): Unit {
    const unit: Unit = {
      id: this.#nextId++,
      kind: EntityKind.Unit,
      type,
      army,
      x: this.clampX(x),
      y: this.clampY(y),
      hp: this.unitMaxHp(type, item),
      targetId: undefined,
      retargetAt: this.time,
      cooldown: 0,
      raisedAt: -Infinity,
      fighting: false,
      group: undefined,
      returning: false,
      item,
      contactAt: -Infinity,
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
      fleeingSince: undefined,
      members: new Set(),
    };
    this.npcGroups.add(group);
    return group;
  }

  #addNpc(
    type: string,
    x: number,
    y: number,
    group: NpcGroup | undefined,
    event: string | undefined,
    camp?: Camp,
  ): Npc {
    const stats = this.registries.npcs.get(type);
    const npc: Npc = {
      id: this.#nextId++,
      kind: EntityKind.Npc,
      type,
      group,
      event,
      camp,
      offsetX: 0,
      offsetY: 0,
      homeX: this.clampX(x),
      homeY: this.clampY(y),
      x: this.clampX(x),
      y: this.clampY(y),
      hp: stats.hp,
      targetId: undefined,
      retargetAt: this.time,
      cooldown: 0,
      fighting: false,
    };
    if (stats.attack !== undefined) {
      this.hostiles.add(npc);
    }
    this.#add(npc);
    return npc;
  }

  addNpc(group: NpcGroup, type: string, offsetX: number, offsetY: number): Npc {
    const npc = this.#addNpc(
      type,
      group.x + offsetX,
      group.y + offsetY,
      group,
      undefined,
    );
    npc.offsetX = offsetX;
    npc.offsetY = offsetY;
    group.members.add(npc);
    return npc;
  }

  addEventNpc(type: string, x: number, y: number, event: string): Npc {
    return this.#addNpc(type, x, y, undefined, event);
  }

  addObstacle(type: string, x: number, y: number): Npc {
    return this.#addNpc(type, x, y, undefined, undefined);
  }

  addCamp(x: number, y: number, lifetimeSec: number, marker = 0): Camp {
    const camp: Camp = {
      id: this.#nextId++,
      kind: EntityKind.Camp,
      x: this.clampX(x),
      y: this.clampY(y),
      expiresAt: this.time + lifetimeSec,
      defenders: new Set(),
      marker,
    };
    this.camps.add(camp);
    this.#add(camp);
    return camp;
  }

  addCampNpc(camp: Camp, type: string, x: number, y: number): Npc {
    const npc = this.#addNpc(type, x, y, undefined, undefined, camp);
    camp.defenders.add(npc);
    return npc;
  }

  addProjectile(
    type: string,
    from: { x: number; y: number },
    targetId: number,
    damage: number,
    attacker: Army | undefined,
    attackerName: string,
  ): Projectile {
    const projectile: Projectile = {
      id: this.#nextId++,
      kind: EntityKind.Projectile,
      type,
      x: this.clampX(from.x),
      y: this.clampY(from.y),
      targetId,
      damage,
      attacker,
      attackerName,
      fromX: from.x,
      fromY: from.y,
    };
    this.projectiles.add(projectile);
    this.#add(projectile);
    return projectile;
  }

  addMist(type: string, x: number, y: number, lifetimeSec: number): Mist {
    const angle = this.random() * 2 * Math.PI;
    const mist: Mist = {
      id: this.#nextId++,
      kind: EntityKind.Mist,
      type,
      x: this.clampX(x),
      y: this.clampY(y),
      dirX: Math.cos(angle),
      dirY: Math.sin(angle),
      turnAt: this.time,
      expiresAt: this.time + lifetimeSec,
    };
    this.mists.add(mist);
    this.#add(mist);
    return mist;
  }

  addBombing(x: number, y: number, delaySec: number): Bombing {
    const bombing: Bombing = {
      id: this.#nextId++,
      kind: EntityKind.Bombing,
      x: this.clampX(x),
      y: this.clampY(y),
      strikeAt: this.time + delaySec,
      struck: false,
    };
    this.bombings.add(bombing);
    this.#add(bombing);
    return bombing;
  }

  addCorpse(
    type: string,
    owner: Army,
    killer: Army | undefined,
    x: number,
    y: number,
    item?: string,
  ): Corpse {
    const corpse: Corpse = {
      id: this.#nextId++,
      kind: EntityKind.Corpse,
      type,
      owner,
      killer,
      group: undefined,
      diedAt: this.time,
      sacred: false,
      item,
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

  addCross(x: number, y: number, lifetimeSec: number): Cross {
    const cross: Cross = {
      id: this.#nextId++,
      kind: EntityKind.Cross,
      x: this.clampX(x),
      y: this.clampY(y),
      expiresAt: this.time + lifetimeSec,
      readyAt: this.time,
      strengths: new Map(),
    };
    this.crosses.add(cross);
    this.#add(cross);
    return cross;
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
    army.groups.clear();
    army.battle = undefined;
    army.slots.clear();
    army.slotLayout = undefined;
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
        entity.army.slots.delete(entity);
        entity.group?.units.delete(entity);
        break;
      case EntityKind.Npc:
        this.hostiles.delete(entity);
        entity.camp?.defenders.delete(entity);
        if (entity.group !== undefined) {
          entity.group.members.delete(entity);
          if (entity.group.members.size === 0) {
            this.npcGroups.delete(entity.group);
          }
        }
        break;
      case EntityKind.Corpse:
        entity.owner.corpses.delete(entity);
        entity.group?.corpses.delete(entity);
        break;
      case EntityKind.PointOfInterest:
        this.points.delete(entity);
        break;
      case EntityKind.Cross:
        this.crosses.delete(entity);
        break;
      case EntityKind.Projectile:
        this.projectiles.delete(entity);
        break;
      case EntityKind.Mist:
        this.mists.delete(entity);
        break;
      case EntityKind.Camp:
        this.camps.delete(entity);
        break;
      case EntityKind.Bombing:
        this.bombings.delete(entity);
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
    for (const cross of this.crosses) {
      cross.strengths.delete(army);
    }
    for (const event of this.events.values()) {
      event.contributions.delete(army);
    }
    for (const [token, reconnect] of this.reconnects) {
      if (reconnect.army === army) {
        this.reconnects.delete(token);
      }
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
