import { Container, Sprite, Texture } from "pixi.js";
import { EntityKind, neutralArmy, type SnapshotEntity } from "@horde/shared";
import type { Connection } from "../net/connection.js";
import { animationFrames, armyColor, frameAt, spriteName } from "./sprites.js";

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const movingEpsilon = 0.001;
const auraAlpha = 0.55;
const grimoireOffset = { x: 14, y: -26 };
const grimoireBob = 3;

class EntityView {
  readonly container = new Container();
  readonly aura = new Sprite();
  readonly body = new Sprite();
  readonly extra = new Sprite();
  x = Number.NaN;
  y = 0;
  facing = 1;
  movedAt = -Infinity;

  constructor() {
    this.aura.anchor.set(0.5);
    this.aura.alpha = auraAlpha;
    this.body.anchor.set(0.5, 0.6);
    this.extra.anchor.set(0.5);
    this.container.addChild(this.aura, this.body, this.extra);
  }

  reset(): void {
    this.x = Number.NaN;
    this.facing = 1;
    this.movedAt = -Infinity;
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
  readonly #active = new Map<number, EntityView>();
  readonly #pool: EntityView[] = [];
  readonly #seen = new Set<number>();
  readonly #frames = new Map<string, Texture[]>();

  constructor(
    readonly textures: Partial<Record<string, Texture>>,
    readonly connection: Connection,
  ) {
    this.container.sortableChildren = true;
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

  #acquire(): EntityView {
    const view = this.#pool.pop() ?? new EntityView();
    view.reset();
    this.container.addChild(view.container);
    return view;
  }

  #release(id: number, view: EntityView): void {
    this.container.removeChild(view.container);
    this.#pool.push(view);
    this.#active.delete(id);
  }

  #draw(view: EntityView, entity: SnapshotEntity, now: number): void {
    const { client, content } = this.connection.config;
    const moving = view.track(entity.x, entity.y, now, client.walkFrameMs);
    const walk = this.#animation(spriteName(entity, content), "walk");
    view.body.texture =
      (moving ? frameAt(walk, now, client.walkFrameMs) : walk[0]) ??
      Texture.WHITE;
    view.body.scale.x = view.facing;

    view.aura.visible = entity.army !== neutralArmy;
    if (view.aura.visible) {
      view.aura.texture = this.textures["fx-aura"] ?? Texture.WHITE;
      view.aura.tint = armyColor(client.armyColors, entity.army);
      view.aura.width = view.body.texture.width * 1.2;
      view.aura.height = view.body.texture.height * 0.6;
      view.aura.y = view.body.texture.height * 0.3;
    }

    view.extra.visible = entity.kind === EntityKind.Mage;
    if (view.extra.visible) {
      view.extra.texture = this.textures["mage-grimoire"] ?? Texture.WHITE;
      const phase = (now / client.grimoireBobMs) * 2 * Math.PI;
      view.extra.position.set(
        grimoireOffset.x * view.facing,
        grimoireOffset.y + Math.sin(phase) * grimoireBob,
      );
    }
  }

  update(entities: SnapshotEntity[], view: Rect, now: number): void {
    const scale = 1 / this.connection.config.client.pixelsPerMeter;
    this.#seen.clear();
    for (const entity of entities) {
      this.#seen.add(entity.id);
      let entityView = this.#active.get(entity.id);
      if (entityView === undefined) {
        entityView = this.#acquire();
        this.#active.set(entity.id, entityView);
      }
      this.#draw(entityView, entity, now);
      const { container, body } = entityView;
      container.scale.set(scale);
      container.position.set(entity.x, entity.y);
      container.zIndex = entity.y;
      const halfWidth = (body.texture.width * scale) / 2;
      const halfHeight = (body.texture.height * scale) / 2;
      container.visible =
        entity.x + halfWidth >= view.minX &&
        entity.x - halfWidth <= view.maxX &&
        entity.y + halfHeight >= view.minY &&
        entity.y - halfHeight <= view.maxY;
    }
    for (const [id, entityView] of this.#active) {
      if (!this.#seen.has(id)) {
        this.#release(id, entityView);
      }
    }
  }
}
