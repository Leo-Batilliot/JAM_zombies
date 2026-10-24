import { join } from "node:path";
import type { Config } from "@horde/shared";
import { loadConfig } from "../../src/config/load.js";
import { runTick } from "../../src/world/loop.js";
import { World, type Mage } from "../../src/world/world.js";

export const sharedConfigDir = join(
  import.meta.dirname,
  "../../../shared/config",
);

export const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
};

export interface Bench {
  config: Config;
  world: World;
  addMage: (x: number, y: number) => Mage;
  step: (ticks?: number) => void;
}

export const createBench = (
  patch: (config: Config) => void = () => undefined,
  seed = 1,
): Bench => {
  const config = loadConfig(sharedConfigDir);
  patch(config);
  const world = new World(config, seededRandom(seed));
  return {
    config,
    world,
    addMage: (x, y) => world.addMage(x, y),
    step: (ticks = 1) => {
      for (let index = 0; index < ticks; index++) {
        runTick(world, 1 / config.network.tickRate);
      }
    },
  };
};
