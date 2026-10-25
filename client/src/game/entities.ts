import { Container, Sprite, Texture } from "pixi.js";
import {
  EntityFlag,
  EntityKind,
  maxFlagLevel,
  neutralArmy,
  flagLevel,
  type SnapshotEntity,
} from "@horde/shared";
import type { Connection } from "../net/connection.js";
import type { Outline } from "./outlines.js";
import {
  animationFrames,
  armyColor,
  directionOf,
  hasDirections,
  parseHex,
  frameAt,
  gearName,
  layerOf,
  spriteName,
  type Direction,
} from "./sprites.js";

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const movingEpsilon = 0.001;
const auraAlpha = 0.55;
const searchedAlpha = 0.4;
const grimoireOffset = { x: 14, y: -26 };
const flagOffset = { x: -8, y: -18 };
const noOffset = { x: 0, y: 0 };
const rechargingAlpha = 0.45;
const soulOffset = -16;
const bobHeight = 3;
const deathReach = 0.6;
const groundKinds = new Set([
  EntityKind.Corpse,
  EntityKind.PointOfInterest,
  EntityKind.Cross,
  EntityKind.Camp,
]);

const bodyAnchor = { x: 0.5, y: 0.6 };
const footAnchor = { x: 0.5, y: 0.8 };
const fullHp = 0xff;
const healthKinds = new Set([EntityKind.Mage, EntityKind.Unit, EntityKind.Npc]);

const bob = (now: number, periodMs: number): number =>
  Math.sin((now / periodMs) * 2 * Math.PI) * bobHeight;

class EntityView {
  readonly container = new Container();
  readonly aura = new Sprite();
  readonly shadow = new Sprite();
  readonly outline = new Sprite();
  readonly body = new Sprite();
  readonly hpBack = new Sprite(Texture.WHITE);
  readonly hpFill = new Sprite(Texture.WHITE);
  readonly extra = new Sprite();
  readonly gear = new Sprite();
  kind = EntityKind.Mage;
  x = Number.NaN;
  y = 0;
  facing = 1;
  direction: Direction = "s";
  size = 1;
  sprite = "";
  movedAt = -Infinity;
  risingSince: number | undefined;
  diedAt: number | undefined;

  constructor() {
    this.aura.anchor.set(0.5);
    this.aura.alpha = auraAlpha;
    this.shadow.anchor.set(0.5);
    this.shadow.tint = 0x000000;
    this.body.anchor.set(bodyAnchor.x, bodyAnchor.y);
    this.extra.anchor.set(0.5);
    this.gear.anchor.set(0.5);
    this.hpBack.anchor.set(0.5, 0);
    this.container.addChild(
      this.shadow,
      this.aura,
      this.outline,
      this.body,
      this.gear,
      this.extra,
      this.hpBack,
      this.hpFill,
    );
  }

  reset(): void {
    this.x = Number.NaN;
    this.facing = 1;
    this.direction = "s";
    this.size = 1;
    this.sprite = "";
    this.movedAt = -Infinity;
    this.risingSince = undefined;
    this.diedAt = undefined;
    this.container.alpha = 1;
    this.body.alpha = 1;
    this.body.y = 0;
    this.outline.y = 0;
    this.shadow.visible = false;
    this.body.scale.set(1);
    this.body.rotation = 0;
    this.body.anchor.set(bodyAnchor.x, bodyAnchor.y);
    this.gear.visible = false;
    this.outline.visible = false;
    this.hpBack.visible = false;
    this.hpFill.visible = false;
  }

  track(x: number, y: number, now: number, holdMs: number): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    if (Math.abs(dx) > movingEpsilon || Math.abs(dy) > movingEpsilon) {
      this.movedAt = now;
      this.direction = directionOf(dx, dy, this.direction, movingEpsilon);
      if (Math.abs(dx) > movingEpsilon) {
        this.facing = Math.sign(dx);
      }
    }
    this.x = x;
    this.y = y;
    return now - this.movedAt < holdMs;
  }
}

export class EntityLayer {
  readonly container = new Container();
  readonly #ground = new Container();
  readonly #bodies = new Container();
  readonly #active = new Map<number, EntityView>();
  readonly #dying = new Set<EntityView>();
  readonly #pool: EntityView[] = [];
  readonly #seen = new Set<number>();
  readonly #frames = new Map<string, Texture[]>();

  #ownArmy: number | undefined;

  constructor(
    readonly textures: Partial<Record<string, Texture>>,
    readonly connection: Connection,
    readonly outlines: Map<Texture, Outline>,
  ) {
    this.#bodies.sortableChildren = true;
    this.container.addChild(this.#ground, this.#bodies);
  }

  #animation(
    name: string,
    animation: string,
    direction: Direction = "s",
  ): Texture[] {
    const key = `${name}:${animation}:${direction}`;
    let frames = this.#frames.get(key);
    if (frames === undefined) {
      frames = animationFrames(this.textures, name, animation, direction);
      if (frames.length === 0) {
        frames = [Texture.WHITE];
      }
      this.#frames.set(key, frames);
    }
    return frames;
  }

  #resolve(name: string): { sprite: string; scale: number } {
    return (
      this.connection.config.client.spriteAliases[name] ?? {
        sprite: name,
        scale: 1,
      }
    );
  }

  #texture(name: string): Texture {
    return this.textures[this.#resolve(name).sprite] ?? Texture.WHITE;
  }

  #acquire(kind: EntityKind): EntityView {
    const view = this.#pool.pop() ?? new EntityView();
    view.reset();
    view.kind = kind;
    (groundKinds.has(kind) ? this.#ground : this.#bodies).addChild(
      view.container,
    );
    return view;
  }

  #release(view: EntityView): void {
    view.container.removeFromParent();
    this.#pool.push(view);
  }

  #drawBody(view: EntityView, entity: SnapshotEntity, now: number): void {
    const { client, content } = this.connection.config;
    const { sprite: name, scale: size } = this.#resolve(
      spriteName(entity, content),
    );
    view.size = size;
    view.sprite = name;
    const anchor = hasDirections(this.textures, name) ? footAnchor : bodyAnchor;
    view.body.anchor.set(anchor.x, anchor.y);
    const moving = view.track(entity.x, entity.y, now, client.walkFrameMs);
    const fighting = (entity.flags & EntityFlag.Fighting) !== 0;
    const walk = this.#animation(name, "walk", view.direction);
    const frames = fighting
      ? this.#animation(name, "attack", view.direction)
      : walk;
    view.body.texture =
      (moving || fighting
        ? frameAt(
            frames,
            now,
            fighting ? client.attackFrameMs : client.walkFrameMs,
          )
        : walk[0]) ?? Texture.WHITE;
    view.body.scale.x = this.#flip(view) * view.size;

    view.aura.visible = entity.army !== neutralArmy;
    if (view.aura.visible) {
      view.aura.texture = this.#texture("fx-aura");
      view.aura.tint = armyColor(client.armyColors, entity.army);
      const footprint = this.#footprint(view);
      view.aura.width = footprint * 1.2;
      view.aura.height = footprint * 0.6;
      view.aura.y = view.body.texture.height * (1 - view.body.anchor.y) * 0.5;
    }

    this.#drawLayer(view, entity);

    const gear = gearName(entity, content);
    view.gear.visible = gear !== undefined;
    if (gear !== undefined) {
      const category = content.units[entity.type]?.equipment ?? "";
      const offset = client.gearOffsets[category] ?? noOffset;
      view.gear.texture = this.#texture(gear);
      view.gear.scale.x = view.facing;
      view.gear.position.set(offset.x * view.facing, offset.y);
    }

    const abandoned = (entity.flags & EntityFlag.Abandoned) !== 0;
    view.extra.visible = entity.kind === EntityKind.Mage || abandoned;
    if (entity.kind === EntityKind.Mage) {
      view.extra.texture = this.#texture("mage-grimoire");
      view.extra.position.set(
        grimoireOffset.x * view.facing,
        grimoireOffset.y + bob(now, client.grimoireBobMs),
      );
    } else if (abandoned) {
      view.extra.texture = this.#texture("fx-flag");
      view.extra.position.set(flagOffset.x, flagOffset.y);
    }

    this.#drawRise(view, entity, now);
    const obstacle =
      entity.kind === EntityKind.Npc && content.obstacles.includes(entity.type);
    this.#drawOutline(view, obstacle ? undefined : this.#relationColor(entity));
    view.hpBack.visible = false;
    view.hpFill.visible = false;
    if (healthKinds.has(entity.kind) && !obstacle) {
      this.#drawHealth(view, entity);
    }
  }

  #drawLayer(view: EntityView, entity: SnapshotEntity): void {
    const { client, content } = this.connection.config;
    const layer = layerOf(entity, content);
    const lift = layer === "air" ? client.layerLook.airLift : 0;
    view.body.y = -lift;
    view.body.alpha = layer === "ethereal" ? client.layerLook.etherealAlpha : 1;
    view.shadow.visible = lift > 0;
    if (view.shadow.visible) {
      const footprint = this.#footprint(view);
      view.shadow.texture = this.#texture("fx-aura");
      view.shadow.alpha = client.layerLook.shadowAlpha;
      view.shadow.width = footprint * 0.8;
      view.shadow.height = footprint * 0.3;
    }
  }

  #relationColor(entity: SnapshotEntity): number {
    const { outline } = this.connection.config.client;
    return parseHex(
      entity.army !== neutralArmy && entity.army === this.#ownArmy
        ? outline.ally
        : outline.enemy,
    );
  }

  #drawOutline(view: EntityView, color: number | undefined): void {
    const outline =
      color === undefined ? undefined : this.outlines.get(view.body.texture);
    view.outline.visible = outline !== undefined;
    if (outline === undefined || color === undefined) {
      return;
    }
    const { width, height } = view.body.texture;
    view.outline.texture = outline.texture;
    view.outline.anchor.set(
      (width * view.body.anchor.x + outline.border) /
        (width + 2 * outline.border),
      (height * view.body.anchor.y + outline.border) /
        (height + 2 * outline.border),
    );
    view.outline.scale.copyFrom(view.body.scale);
    view.outline.y = view.body.y;
    view.outline.rotation = view.body.rotation;
    view.outline.alpha = this.connection.config.client.outline.alpha;
    view.outline.tint = color;
  }

  #drawHealth(view: EntityView, entity: SnapshotEntity): void {
    const { client, content } = this.connection.config;
    const { hpBar } = client;
    const strength =
      entity.kind === EntityKind.Unit
        ? (content.units[entity.type]?.strength ?? 1)
        : 1;
    const width =
      hpBar.width *
      (1 + hpBar.growth * Math.log2(strength)) *
      (entity.kind === EntityKind.Mage ? hpBar.mageScale : 1);
    const height =
      hpBar.height * (entity.kind === EntityKind.Mage ? hpBar.mageScale : 1);
    const top =
      view.body.texture.height * (1 - view.body.anchor.y) + hpBar.offsetY;
    const ally = entity.army !== neutralArmy && entity.army === this.#ownArmy;
    view.hpBack.visible = true;
    view.hpBack.tint = parseHex(hpBar.background);
    view.hpBack.width = width;
    view.hpBack.height = height;
    view.hpBack.position.set(0, top);
    view.hpFill.visible = entity.hp > 0;
    view.hpFill.tint = parseHex(ally ? hpBar.ally : hpBar.enemy);
    view.hpFill.width = (width * entity.hp) / fullHp;
    view.hpFill.height = height;
    view.hpFill.position.set(-width / 2, top);
  }

  #footprint(view: EntityView): number {
    const [still] = this.#animation(view.sprite, "walk", "s");
    return still?.frame.width ?? view.body.texture.width;
  }

  #flip(view: EntityView): number {
    return hasDirections(this.textures, view.sprite) ? 1 : view.facing;
  }

  #deathFrames(view: EntityView): Texture[] | undefined {
    return hasDirections(this.textures, view.sprite)
      ? this.#animation(view.sprite, "death", view.direction)
      : undefined;
  }

  #drawRise(view: EntityView, entity: SnapshotEntity, now: number): void {
    if ((entity.flags & EntityFlag.Rising) === 0) {
      view.risingSince = undefined;
      view.container.alpha = 1;
      view.body.scale.y = view.size;
      return;
    }
    view.risingSince ??= now;
    const riseMs = this.connection.config.gameplay.riseSec * 1000;
    const progress = Math.min((now - view.risingSince) / riseMs, 1);
    const death = this.#deathFrames(view);
    if (death === undefined) {
      view.container.alpha = progress;
      view.body.scale.y = progress * view.size;
      return;
    }
    const index = Math.min(
      death.length - 1,
      Math.floor((1 - progress) * death.length),
    );
    view.body.texture = death[index] ?? view.body.texture;
    view.container.alpha = Math.min(1, progress * 3);
    view.body.scale.y = view.size;
  }

  #drawProjectile(view: EntityView, entity: SnapshotEntity): void {
    const dx = entity.x - view.x;
    const dy = entity.y - view.y;
    if (Math.hypot(dx, dy) > movingEpsilon) {
      view.body.rotation = Math.atan2(dy, dx);
    }
    view.x = entity.x;
    view.y = entity.y;
    view.aura.visible = false;
    view.extra.visible = false;
    view.body.texture = this.#texture(
      spriteName(entity, this.connection.config.content),
    );
    view.outline.visible = false;
  }

  #drawGround(view: EntityView, entity: SnapshotEntity, now: number): void {
    const { client, content } = this.connection.config;
    view.aura.visible = false;
    view.body.texture = this.#texture(spriteName(entity, content));
    if (entity.kind === EntityKind.Cross) {
      view.body.scale.set(1);
      view.body.alpha =
        flagLevel(entity.flags) === maxFlagLevel ? 1 : rechargingAlpha;
    } else {
      view.body.scale.set(1 + flagLevel(entity.flags) * client.sizeScaleStep);
      view.body.alpha =
        (entity.flags & EntityFlag.Searched) !== 0 ? searchedAlpha : 1;
    }
    this.#drawOutline(
      view,
      entity.kind === EntityKind.PointOfInterest &&
        (entity.flags & EntityFlag.Searched) === 0
        ? parseHex(client.outline.useful)
        : undefined,
    );
    view.extra.visible =
      entity.kind === EntityKind.Corpse &&
      (entity.flags & EntityFlag.Waiting) !== 0;
    if (view.extra.visible) {
      view.extra.texture = this.#texture("soul");
      view.extra.position.set(0, soulOffset + bob(now, client.soulBobMs));
    }
  }

  #drawDying(now: number): void {
    const { deathMs } = this.connection.config.client;
    for (const view of this.#dying) {
      const progress = (now - (view.diedAt ?? now)) / deathMs;
      if (progress >= 1) {
        this.#dying.delete(view);
        this.#release(view);
        continue;
      }
      const death = this.#deathFrames(view);
      if (death === undefined) {
        view.container.alpha = 1 - progress;
        view.body.scale.set(view.facing * (1 - progress / 2), 1 - progress / 2);
      } else {
        view.body.texture =
          death[
            Math.min(
              death.length - 1,
              Math.floor(progress * death.length * 1.5),
            )
          ] ?? view.body.texture;
        view.container.alpha = Math.min(1, 3 * (1 - progress));
      }
      view.outline.visible = false;
      view.gear.visible = false;
      view.extra.visible = false;
      view.hpBack.visible = false;
      view.hpFill.visible = false;
    }
  }

  update(
    entities: SnapshotEntity[],
    view: Rect,
    now: number,
    ownArmy: number | undefined,
  ): void {
    this.#ownArmy = ownArmy;
    const scale = 1 / this.connection.config.client.pixelsPerMeter;
    this.#seen.clear();
    const corpses: SnapshotEntity[] = [];
    for (const entity of entities) {
      if (
        entity.kind === EntityKind.Mist ||
        entity.kind === EntityKind.Bombing
      ) {
        continue;
      }
      this.#seen.add(entity.id);
      let entityView = this.#active.get(entity.id);
      if (entityView === undefined) {
        entityView = this.#acquire(entity.kind);
        this.#active.set(entity.id, entityView);
        if (entity.kind === EntityKind.Corpse) {
          corpses.push(entity);
        }
      }
      if (entity.kind === EntityKind.Projectile) {
        this.#drawProjectile(entityView, entity);
      } else if (groundKinds.has(entity.kind)) {
        this.#drawGround(entityView, entity, now);
      } else {
        this.#drawBody(entityView, entity, now);
      }
      const { container, body } = entityView;
      container.scale.set(scale);
      container.position.set(entity.x, entity.y);
      container.zIndex = entity.y;
      const halfWidth = (body.width * scale) / 2;
      const halfHeight = (body.height * scale) / 2;
      container.visible =
        entity.x + halfWidth >= view.minX &&
        entity.x - halfWidth <= view.maxX &&
        entity.y + halfHeight >= view.minY &&
        entity.y - halfHeight <= view.maxY;
    }
    for (const [id, entityView] of this.#active) {
      if (this.#seen.has(id)) {
        continue;
      }
      this.#active.delete(id);
      const fell = corpses.some(
        (corpse) =>
          Math.hypot(corpse.x - entityView.x, corpse.y - entityView.y) <=
          deathReach,
      );
      if (
        entityView.container.visible &&
        (entityView.kind === EntityKind.Mage ||
          (fell && this.#deathFrames(entityView) !== undefined))
      ) {
        entityView.diedAt = now;
        this.#dying.add(entityView);
      } else {
        this.#release(entityView);
      }
    }
    this.#drawDying(now);
  }
}
