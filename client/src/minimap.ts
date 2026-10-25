export interface MinimapPoint {
  x: number;
  y: number;
}

const selfColor = "#ece3f5";
const bossColor = "#ff9a1f";
const dotRadius = 3;

export class Minimap {
  readonly canvas = document.createElement("canvas");
  readonly #context: CanvasRenderingContext2D | null;

  constructor(root: HTMLElement) {
    this.canvas.className = "minimap";
    this.#context = this.canvas.getContext("2d");
    root.append(this.canvas);
  }

  draw(
    size: number,
    world: { width: number; height: number },
    self: MinimapPoint | undefined,
    bosses: MinimapPoint[],
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
    const dot = (point: MinimapPoint, color: string): void => {
      context.fillStyle = color;
      context.beginPath();
      context.arc(point.x * scale, point.y * scale, dotRadius, 0, 2 * Math.PI);
      context.fill();
    };
    for (const boss of bosses) {
      dot(boss, bossColor);
    }
    if (self !== undefined) {
      dot(self, selfColor);
    }
  }
}
