import { followMages } from "../systems/formation.js";
import { moveMages } from "../systems/movement.js";
import { separateBodies } from "../systems/separation.js";
import type { World } from "./world.js";

export type System = (world: World, dt: number) => void;

export const systems: System[] = [moveMages, followMages, separateBodies];

export const runTick = (world: World, dt: number): void => {
  for (const system of systems) {
    system(world, dt);
  }
  world.tick++;
  world.time += dt;
};

export interface TickStats {
  lastMs: number;
  maxMs: number;
}

export interface Loop {
  stats: TickStats;
  stop: () => void;
}

export const startLoop = (world: World, afterTick: () => void): Loop => {
  const stats: TickStats = { lastMs: 0, maxMs: 0 };
  let next = performance.now();
  let timer: NodeJS.Timeout | undefined;

  const run = (): void => {
    const intervalMs = 1000 / world.config.network.tickRate;
    const start = performance.now();
    runTick(world, intervalMs / 1000);
    afterTick();
    stats.lastMs = performance.now() - start;
    stats.maxMs = Math.max(stats.maxMs, stats.lastMs);
    if (stats.lastMs > intervalMs) {
      console.warn(
        `Tick ${String(world.tick)} took ${stats.lastMs.toFixed(1)} ms (budget ${intervalMs.toFixed(1)} ms)`,
      );
    }
    next = Math.max(next + intervalMs, performance.now() - intervalMs);
    timer = setTimeout(run, next - performance.now());
  };

  timer = setTimeout(run, 0);
  return {
    stats,
    stop: () => {
      clearTimeout(timer);
    },
  };
};
