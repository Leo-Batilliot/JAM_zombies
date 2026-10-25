import { Graphics } from "pixi.js";

const width = 1.6;
const height = 0.22;
const offsetY = -1.7;
const backColor = 0x141018;
const fillColor = 0xf6d660;

export class SearchBar {
  readonly graphics = new Graphics();

  update(progress: number, mage: { x: number; y: number } | undefined): void {
    this.graphics.clear();
    if (progress <= 0 || mage === undefined) {
      return;
    }
    const left = mage.x - width / 2;
    const top = mage.y + offsetY;
    this.graphics
      .rect(left, top, width, height)
      .fill({ color: backColor, alpha: 0.8 })
      .rect(left, top, width * Math.min(progress, 1), height)
      .fill({ color: fillColor });
  }
}
