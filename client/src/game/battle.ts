import { Container, Graphics } from "pixi.js";
import { BattleFlag, type AggroCircle } from "@horde/shared";

const circleColor = 0xe0605a;
const circleWidth = 0.25;
const arrowColor = 0xb36ad4;
const arrowWidth = 0.3;
const arrowHead = 1.2;

export const pulse = (now: number, periodMs: number): number =>
  0.55 + 0.45 * Math.sin((now / periodMs) * 2 * Math.PI);

export class BattleLayer {
  readonly container = new Container();
  readonly #circles = new Graphics();
  readonly #arrow = new Graphics();
  #drawn: AggroCircle[] = [];

  constructor() {
    this.container.addChild(this.#circles, this.#arrow);
  }

  update(
    battle: number,
    circles: AggroCircle[],
    mage: { x: number; y: number } | undefined,
    exit: { x: number; y: number } | undefined,
    now: number,
    pulseMs: number,
  ): void {
    if (circles !== this.#drawn) {
      this.#drawn = circles;
      this.#circles.clear();
      for (const circle of circles) {
        this.#circles
          .circle(circle.x, circle.y, circle.radius)
          .stroke({ color: circleColor, width: circleWidth });
      }
    }
    this.#circles.visible = (battle & BattleFlag.InBattle) !== 0;
    this.#circles.alpha = pulse(now, pulseMs);

    this.#arrow.clear();
    if (
      (battle & BattleFlag.Retreating) === 0 ||
      mage === undefined ||
      exit === undefined
    ) {
      return;
    }
    const dx = exit.x - mage.x;
    const dy = exit.y - mage.y;
    const length = Math.hypot(dx, dy);
    if (length < arrowHead) {
      return;
    }
    const ux = dx / length;
    const uy = dy / length;
    this.#arrow
      .moveTo(mage.x, mage.y)
      .lineTo(exit.x, exit.y)
      .moveTo(
        exit.x - ux * arrowHead - uy * arrowHead * 0.6,
        exit.y - uy * arrowHead + ux * arrowHead * 0.6,
      )
      .lineTo(exit.x, exit.y)
      .lineTo(
        exit.x - ux * arrowHead + uy * arrowHead * 0.6,
        exit.y - uy * arrowHead - ux * arrowHead * 0.6,
      )
      .stroke({ color: arrowColor, width: arrowWidth, alpha: 0.8 });
  }
}
