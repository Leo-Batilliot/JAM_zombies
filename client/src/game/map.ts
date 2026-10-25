import { Container, Graphics, Sprite, Texture, TilingSprite } from "pixi.js";
import type { ClientConfig, Obstacle } from "@horde/shared";
import { layoutCity, type CityLayout, type DecorItem } from "./decor.js";

type CityLook = ClientConfig["client"]["city"];

const decorAnchor = { x: 0.5, y: 0.8 };
const edgeWidth = 0.15;

export class MapLayer {
  readonly container = new Container();
  layout: CityLayout | undefined;

  constructor(readonly textures: Partial<Record<string, Texture>>) {}

  #texture(name: string): Texture {
    return this.textures[name] ?? Texture.WHITE;
  }

  #tiling(
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    pixelsPerMeter: number,
  ): TilingSprite {
    const tiling = new TilingSprite({
      texture: this.#texture(name),
      width: width * pixelsPerMeter,
      height: height * pixelsPerMeter,
    });
    tiling.scale.set(1 / pixelsPerMeter);
    tiling.position.set(x, y);
    return tiling;
  }

  #sprites(
    items: DecorItem[],
    pixelsPerMeter: number,
    anchor = decorAnchor,
  ): Sprite[] {
    return items.map((item) => {
      const sprite = new Sprite(this.#texture(item.sprite));
      sprite.anchor.set(anchor.x, anchor.y);
      sprite.scale.set(1 / pixelsPerMeter);
      sprite.position.set(item.x, item.y);
      return sprite;
    });
  }

  #outside(config: ClientConfig, layout: CityLayout): Container {
    const { width, height } = config.world;
    const { pixelsPerMeter } = config.client;
    const { depth, ground, shade, shadeAlpha } = config.client.city.outside;
    const outside = new Container();
    outside.addChild(
      this.#tiling(
        ground,
        -depth,
        -depth,
        width + 2 * depth,
        height + 2 * depth,
        pixelsPerMeter,
      ),
      new Graphics()
        .rect(-depth, -depth, width + 2 * depth, depth)
        .rect(-depth, height, width + 2 * depth, depth)
        .rect(-depth, 0, depth, height)
        .rect(width, 0, depth, height)
        .fill({ color: shade, alpha: shadeAlpha }),
    );
    for (const tree of this.#sprites(layout.outside, pixelsPerMeter)) {
      outside.addChildAt(tree, outside.children.length - 1);
    }
    return outside;
  }

  #obstacle(
    obstacle: Obstacle,
    look: CityLook,
    pixelsPerMeter: number,
  ): Container | undefined {
    const style = look.obstacles[obstacle.kind];
    if (style === undefined) {
      return undefined;
    }
    if ("sprite" in style) {
      const sprite = new Sprite(this.#texture(style.sprite));
      sprite.anchor.set(0.5, style.anchorY);
      if (obstacle.radius > 0) {
        sprite.width = 2 * obstacle.radius * style.scale;
        sprite.scale.y = sprite.scale.x;
        sprite.position.set(obstacle.x, obstacle.y);
      } else {
        sprite.width = obstacle.width * style.scale;
        sprite.height = obstacle.height * style.scale;
        sprite.position.set(
          obstacle.x + obstacle.width / 2,
          obstacle.y + obstacle.height * style.anchorY,
        );
      }
      return sprite;
    }
    const wall = Math.min(style.wallMeters, obstacle.height);
    const shape = new Container();
    shape.addChild(
      this.#tiling(
        style.roof,
        obstacle.x,
        obstacle.y,
        obstacle.width,
        obstacle.height - wall,
        pixelsPerMeter,
      ),
      this.#tiling(
        style.wall,
        obstacle.x,
        obstacle.y + obstacle.height - wall,
        obstacle.width,
        wall,
        pixelsPerMeter,
      ),
      new Graphics()
        .rect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
        .stroke({ color: look.edge, width: edgeWidth }),
    );
    return shape;
  }

  #add(children: Container[]): void {
    for (const child of children) {
      this.container.addChild(child);
    }
  }

  build(config: ClientConfig): void {
    this.container.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
    const layout = layoutCity(config);
    this.layout = layout;
    const look = config.client.city;
    const { pixelsPerMeter } = config.client;

    this.container.addChild(this.#outside(config, layout));
    for (const patch of layout.grounds) {
      const ground = look.grounds[patch.ground];
      this.container.addChild(
        this.#tiling(
          ground?.tile ?? patch.ground,
          patch.x,
          patch.y,
          patch.width,
          patch.height,
          pixelsPerMeter,
        ),
      );
    }
    this.#add(this.#sprites(layout.tiles, pixelsPerMeter, { x: 0, y: 0 }));
    const obstacles = [...layout.city.obstacles].sort(
      (a, b) => a.y + a.height + a.radius - (b.y + b.height + b.radius),
    );
    for (const obstacle of obstacles) {
      const shape = this.#obstacle(obstacle, look, pixelsPerMeter);
      if (shape !== undefined) {
        this.container.addChild(shape);
      }
    }
    this.#add(this.#sprites(layout.ramparts, pixelsPerMeter));
    this.#add(this.#sprites(layout.decor, pixelsPerMeter));
  }
}
