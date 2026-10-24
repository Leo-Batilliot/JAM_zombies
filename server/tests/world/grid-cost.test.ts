import { expect, test } from "vitest";
import { SpatialGrid } from "../../src/world/grid.js";
import { createBench, seededRandom } from "../support/bench.js";

test("updating and querying 4000 entities fits in a fraction of a tick", () => {
  const { config } = createBench();
  const { width, height, gridCellSize } = config.world;
  const random = seededRandom(1);
  const positions = Array.from({ length: 4000 }, () => ({
    x: random() * width,
    y: random() * height,
  }));
  const grid = new SpatialGrid(gridCellSize);
  positions.forEach((position, id) => {
    grid.insert(id, position.x, position.y);
  });
  const out: number[] = [];
  const runs = 20;
  let bestMs = Infinity;
  for (let run = 0; run < runs; run++) {
    const start = performance.now();
    positions.forEach((position, id) => {
      position.x = (position.x + 0.3) % width;
      grid.update(id, position.x, position.y);
    });
    for (const position of positions) {
      out.length = 0;
      grid.queryRadius(position.x, position.y, 8, out);
    }
    bestMs = Math.min(bestMs, performance.now() - start);
  }
  expect(bestMs).toBeLessThan(1000 / config.network.tickRate / 2);
});
