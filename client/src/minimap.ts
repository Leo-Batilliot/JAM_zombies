import type { ClientConfig } from "@horde/shared";
import type { CityLayout } from "./game/decor.js";

type CityLook = ClientConfig["client"]["city"];

export interface MinimapPoint {
  x: number;
  y: number;
}

export interface MinimapMage extends MinimapPoint {
  color: string;
}

const selfColor = "#ece3f5";
const bossColor = "#ff9a1f";
const bountyColor = "#e0605a";
const dotRadius = 3;
const landmarkFont = "bold 11px sans-serif";

const drawPlan = (
  context: CanvasRenderingContext2D,
  layout: CityLayout,
  look: CityLook,
  scale: number,
): void => {
  for (const patch of layout.grounds) {
    context.fillStyle = look.grounds[patch.ground]?.minimap ?? look.edge;
    context.fillRect(
      patch.x * scale,
      patch.y * scale,
      patch.width * scale,
      patch.height * scale,
    );
  }
  context.fillStyle = look.minimapObstacle;
  for (const obstacle of layout.city.obstacles) {
    if (obstacle.radius > 0) {
      context.beginPath();
      context.arc(
        obstacle.x * scale,
        obstacle.y * scale,
        Math.max(obstacle.radius * scale, 1),
        0,
        2 * Math.PI,
      );
      context.fill();
    } else {
      context.fillRect(
        obstacle.x * scale,
        obstacle.y * scale,
        Math.max(obstacle.width * scale, 1),
        Math.max(obstacle.height * scale, 1),
      );
    }
  }
  context.font = landmarkFont;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const district of layout.city.districts) {
    const landmark = look.landmarks[district.template];
    if (landmark !== undefined) {
      context.fillStyle = landmark.color;
      context.fillText(
        landmark.symbol,
        (district.x + district.size / 2) * scale,
        (district.y + district.size / 2) * scale,
      );
    }
  }
};

export class Minimap {
  readonly canvas = document.createElement("canvas");
  readonly #context: CanvasRenderingContext2D | null;
  readonly #plan = document.createElement("canvas");
  #planned: { layout: CityLayout; width: number } | undefined;

  constructor(root: HTMLElement) {
    this.canvas.className = "minimap";
    this.#context = this.canvas.getContext("2d");
    root.append(this.canvas);
  }

  #drawPlan(layout: CityLayout, look: CityLook, scale: number): void {
    const { width, height } = this.canvas;
    if (
      this.#planned?.layout === layout &&
      this.#planned.width === width &&
      this.#plan.height === height
    ) {
      return;
    }
    this.#plan.width = width;
    this.#plan.height = height;
    const context = this.#plan.getContext("2d");
    if (context !== null) {
      drawPlan(context, layout, look, scale);
    }
    this.#planned = { layout, width };
  }

  draw(
    size: number,
    world: { width: number; height: number },
    self: MinimapPoint | undefined,
    bosses: MinimapPoint[],
    bounty: MinimapPoint | undefined,
    mages: MinimapMage[],
    plan?: { layout: CityLayout; look: CityLook },
  ): void {
    const context = this.#context;
    if (context === null) {
      return;
    }
    const scale = size / Math.max(world.width, world.height);
    const width = Math.round(world.width * scale);
    const height = Math.round(world.height * scale);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    context.clearRect(0, 0, width, height);
    if (plan !== undefined) {
      this.#drawPlan(plan.layout, plan.look, scale);
      context.drawImage(this.#plan, 0, 0);
    }
    const dot = (point: MinimapPoint, color: string): void => {
      context.fillStyle = color;
      context.beginPath();
      context.arc(point.x * scale, point.y * scale, dotRadius, 0, 2 * Math.PI);
      context.fill();
    };
    for (const mage of mages) {
      dot(mage, mage.color);
    }
    for (const boss of bosses) {
      dot(boss, bossColor);
    }
    if (bounty !== undefined) {
      dot(bounty, bountyColor);
    }
    if (self !== undefined) {
      dot(self, selfColor);
    }
  }
}
