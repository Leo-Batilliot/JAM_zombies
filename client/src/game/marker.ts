import { Graphics } from "pixi.js";

export class ClickMarker {
  readonly graphics = new Graphics();
  #shownAt = -Infinity;

  constructor(readonly durationMs: () => number) {
    this.graphics.circle(0, 0, 0.6).stroke({ color: 0xb36ad4, width: 0.15 });
    this.graphics.visible = false;
  }

  show(x: number, y: number, now: number): void {
    this.graphics.position.set(x, y);
    this.#shownAt = now;
  }

  update(now: number): void {
    const progress = (now - this.#shownAt) / this.durationMs();
    this.graphics.visible = progress < 1;
    this.graphics.alpha = 1 - progress;
    this.graphics.scale.set(1 + progress);
  }
}
