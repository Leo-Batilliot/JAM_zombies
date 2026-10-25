import { pushOut, type Obstacle } from "@horde/shared";

const passes = 3;

export class ObstacleGrid {
  readonly #cells = new Map<number, Obstacle[]>();

  constructor(
    readonly obstacles: Obstacle[],
    readonly cellSize: number,
  ) {
    for (const obstacle of obstacles) {
      const reach = obstacle.radius;
      const left = obstacle.x - reach;
      const top = obstacle.y - reach;
      const right = obstacle.x + (obstacle.radius > 0 ? reach : obstacle.width);
      const bottom =
        obstacle.y + (obstacle.radius > 0 ? reach : obstacle.height);
      for (let cx = this.#coord(left); cx <= this.#coord(right); cx++) {
        for (let cy = this.#coord(top); cy <= this.#coord(bottom); cy++) {
          const key = this.#key(cx, cy);
          const list = this.#cells.get(key) ?? [];
          list.push(obstacle);
          this.#cells.set(key, list);
        }
      }
    }
  }

  #coord(value: number): number {
    return Math.floor(value / this.cellSize);
  }

  #key(cx: number, cy: number): number {
    return (cx + 0x8000) * 0x10000 + cy + 0x8000;
  }

  near(x: number, y: number, radius: number): Obstacle[] {
    const found = new Set<Obstacle>();
    for (
      let cx = this.#coord(x - radius);
      cx <= this.#coord(x + radius);
      cx++
    ) {
      for (
        let cy = this.#coord(y - radius);
        cy <= this.#coord(y + radius);
        cy++
      ) {
        for (const obstacle of this.#cells.get(this.#key(cx, cy)) ?? []) {
          found.add(obstacle);
        }
      }
    }
    return [...found];
  }

  isFree(x: number, y: number, radius: number): boolean {
    return this.near(x, y, radius).every(
      (obstacle) => pushOut(obstacle, x, y, radius) === undefined,
    );
  }

  resolve(
    x: number,
    y: number,
    radius: number,
  ): { x: number; y: number } | undefined {
    let point = { x, y };
    let moved = false;
    for (let pass = 0; pass < passes; pass++) {
      let changed = false;
      for (const obstacle of this.near(point.x, point.y, radius)) {
        const out = pushOut(obstacle, point.x, point.y, radius);
        if (out !== undefined) {
          point = out;
          changed = true;
          moved = true;
        }
      }
      if (!changed) {
        break;
      }
    }
    return moved ? point : undefined;
  }
}
