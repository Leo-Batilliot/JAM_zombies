import { Container, Sprite, type Texture } from "pixi.js";
import type { EntityKind, SnapshotEntity } from "@horde/shared";

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class EntityLayer {
  readonly container = new Container();
  readonly #active = new Map<number, Sprite>();
  readonly #pool: Sprite[] = [];
  readonly #seen = new Set<number>();

  constructor(
    readonly textures: Record<EntityKind, Texture>,
    readonly scale: () => number,
  ) {}

  #acquire(): Sprite {
    const sprite = this.#pool.pop() ?? new Sprite();
    sprite.anchor.set(0.5);
    this.container.addChild(sprite);
    return sprite;
  }

  #release(id: number, sprite: Sprite): void {
    this.container.removeChild(sprite);
    this.#pool.push(sprite);
    this.#active.delete(id);
  }

  update(entities: SnapshotEntity[], view: Rect): void {
    const scale = 1 / this.scale();
    this.#seen.clear();
    for (const entity of entities) {
      this.#seen.add(entity.id);
      let sprite = this.#active.get(entity.id);
      if (sprite === undefined) {
        sprite = this.#acquire();
        this.#active.set(entity.id, sprite);
      }
      sprite.texture = this.textures[entity.kind];
      sprite.scale.set(scale);
      sprite.position.set(entity.x, entity.y);
      const halfWidth = (sprite.texture.width * scale) / 2;
      const halfHeight = (sprite.texture.height * scale) / 2;
      sprite.visible =
        entity.x + halfWidth >= view.minX &&
        entity.x - halfWidth <= view.maxX &&
        entity.y + halfHeight >= view.minY &&
        entity.y - halfHeight <= view.maxY;
    }
    for (const [id, sprite] of this.#active) {
      if (!this.#seen.has(id)) {
        this.#release(id, sprite);
      }
    }
  }
}
