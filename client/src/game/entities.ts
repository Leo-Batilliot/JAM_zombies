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
import {
  animationFrames,
  armyColor,
  frameAt,
  gearName,
  spriteName,
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
const groundKinds = new Set([
  EntityKind.Corpse,
  EntityKind.PointOfInterest,
  EntityKind.Cross,
  EntityKind.Camp,
]);

const bob = (now: number, periodMs: number): number =>
  Math.sin((now / periodMs) * 2 * Math.PI) * bobHeight;

class EntityView {
  readonly container = new Container();
  readonly aura = new Sprite();
  readonly body = new Sprite();
  readonly extra = new Sprite();
  readonly gear = new Sprite();
  kind = EntityKind.Mage;
  x = Number.NaN;
  y = 0;
  facing = 1;
  movedAt = -Infinity;
  risingSince: number | undefined;
  diedAt: number | undefined;

  constructor() {
    this.aura.anchor.set(0.5);
    this.aura.alpha = auraAlpha;
    this.body.anchor.set(0.5, 0.6);
    this.extra.anchor.set(0.5);
    this.gear.anchor.set(0.5);
    this.container.addChild(this.aura, this.body, this.gear, this.extra);
  }

  reset(): void {
    this.x = Number.NaN;
    this.facing = 1;
    this.movedAt = -Infinity;
    this.risingSince = undefined;
    this.diedAt = undefined;
    this.container.alpha = 1;
    this.body.alpha = 1;
    this.body.scale.set(1);
    this.body.rotation = 0;
    this.gear.visible = false;
  }

  track(x: number, y: number, now: number, holdMs: number): boolean {
    const dx = x - this.x;
    if (Math.abs(dx) > movingEpsilon || Math.abs(y - this.y) > movingEpsilon) {
      this.movedAt = now;
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

  constructor(
    readonly textures: Partial<Record<string, Texture>>,
    readonly connection: Connection,
  ) {
    this.#bodies.sortableChildren = true;
    this.container.addChild(this.#ground, this.#bodies);
  }

  #animation(name: string, animation: string): Texture[] {
    const key = `${name}:${animation}`;
    let frames = this.#frames.get(key);
    if (frames === undefined) {
      frames = animationFrames(this.textures, name, animation);
      if (frames.length === 0) {
        frames = [Texture.WHITE];
      }
      this.#frames.set(key, frames);
    }
    return frames;
  }

  #texture(name: string): Texture {
    return this.textures[name] ?? Texture.WHITE;
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
    const name = spriteName(entity, content);
    const moving = view.track(entity.x, entity.y, now, client.walkFrameMs);
    const fighting = (entity.flags & EntityFlag.Fighting) !== 0;
    const walk = this.#animation(name, "walk");
    const frames = fighting ? this.#animation(name, "attack") : walk;
    view.body.texture =
      (moving || fighting
        ? frameAt(
            frames,
            now,
            fighting ? client.attackFrameMs : client.walkFrameMs,
          )
        : walk[0]) ?? Texture.WHITE;
    view.body.scale.x = view.facing;

    view.aura.visible = entity.army !== neutralArmy;
    if (view.aura.visible) {
      view.aura.texture = this.#texture("fx-aura");
      view.aura.tint = armyColor(client.armyColors, entity.army);
      view.aura.width = view.body.texture.width * 1.2;
      view.aura.height = view.body.texture.height * 0.6;
      view.aura.y = view.body.texture.height * 0.3;
    }

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
  }

  #drawRise(view: EntityView, entity: SnapshotEntity, now: number): void {
    if ((entity.flags & EntityFlag.Rising) === 0) {
      view.risingSince = undefined;
      view.container.alpha = 1;
      view.body.scale.y = 1;
      return;
    }
    view.risingSince ??= now;
    const riseMs = this.connection.config.gameplay.riseSec * 1000;
    const progress = Math.min((now - view.risingSince) / riseMs, 1);
    view.container.alpha = progress;
    view.body.scale.y = progress;
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
      view.container.alpha = 1 - progress;
      view.body.scale.set(view.facing * (1 - progress / 2), 1 - progress / 2);
    }
  }

  update(entities: SnapshotEntity[], view: Rect, now: number): void {
    const scale = 1 / this.connection.config.client.pixelsPerMeter;
    this.#seen.clear();
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
      if (entityView.kind === EntityKind.Mage && entityView.container.visible) {
        entityView.diedAt = now;
        this.#dying.add(entityView);
      } else {
        this.#release(entityView);
      }
    }
    this.#drawDying(now);
  }
}
