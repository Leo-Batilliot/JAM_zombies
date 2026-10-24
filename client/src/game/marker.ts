import { Graphics } from "pixi.js";

const moveColor = 0xb36ad4;
const attackColor = 0xe0605a;

export class ClickMarker {
  readonly graphics = new Graphics();
  #shownAt = -Infinity;

  constructor(readonly durationMs: () => number) {
    this.graphics.circle(0, 0, 0.6).stroke({ color: 0xffffff, width: 0.15 });
    this.graphics.visible = false;
  }

  show(x: number, y: number, now: number, attack: boolean): void {
    this.graphics.position.set(x, y);
    this.graphics.tint = attack ? attackColor : moveColor;
    this.#shownAt = now;
  }

  update(now: number): void {
    const progress = (now - this.#shownAt) / this.durationMs();
    this.graphics.visible = progress < 1;
    this.graphics.alpha = 1 - progress;
    this.graphics.scale.set(1 + progress);
  }
}
