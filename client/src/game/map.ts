import { Container, Graphics, Sprite, Texture, TilingSprite } from "pixi.js";
import type { ClientConfig } from "@horde/shared";
import { placeDecor } from "./decor.js";

const outsideColor = 0x0b080e;
const borderColor = 0x8e44ad;
const borderWidth = 0.3;
const outsideSize = 1000;

export class MapLayer {
  readonly container = new Container();

  constructor(readonly textures: Partial<Record<string, Texture>>) {}

  build(config: ClientConfig): void {
    this.container.removeChildren().forEach((child) => {
      child.destroy();
    });
    const { width, height } = config.world;
    const scale = 1 / config.client.pixelsPerMeter;

    const ground = new TilingSprite({
      texture: this.textures["ground"] ?? Texture.WHITE,
      width: width * config.client.pixelsPerMeter,
      height: height * config.client.pixelsPerMeter,
    });
    ground.scale.set(scale);
    this.container.addChild(ground);

    for (const item of placeDecor(config.world)) {
      const sprite = new Sprite(this.textures[item.sprite] ?? Texture.WHITE);
      sprite.anchor.set(0.5, 0.8);
      sprite.scale.set(scale);
      sprite.position.set(item.x, item.y);
      this.container.addChild(sprite);
    }

    const border = new Graphics()
      .rect(-outsideSize, -outsideSize, width + 2 * outsideSize, outsideSize)
      .rect(-outsideSize, height, width + 2 * outsideSize, outsideSize)
      .rect(-outsideSize, 0, outsideSize, height)
      .rect(width, 0, outsideSize, height)
      .fill({ color: outsideColor, alpha: 0.85 })
      .rect(0, 0, width, height)
      .stroke({ color: borderColor, width: borderWidth });
    this.container.addChild(border);
  }
}
