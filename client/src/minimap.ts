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
const championColor = "#f6d660";
const dotRadius = 3;
const selfRadius = 5;

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
    bounty: MinimapPoint | undefined,
    mages: MinimapMage[],
    champions: MinimapPoint[],
    ground: string,
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
    context.fillStyle = ground;
    context.fillRect(0, 0, width, height);
    const dot = (point: MinimapPoint, color: string, radius = dotRadius) => {
      context.fillStyle = color;
      context.beginPath();
      context.arc(point.x * scale, point.y * scale, radius, 0, 2 * Math.PI);
      context.fill();
    };
    for (const mage of mages) {
      dot(mage, mage.color);
    }
    for (const boss of bosses) {
      dot(boss, bossColor);
    }
    for (const champion of champions) {
      dot(champion, championColor);
    }
    if (bounty !== undefined) {
      dot(bounty, bountyColor);
    }
    if (self !== undefined) {
      dot(self, selfColor, selfRadius);
    }
  }
}
