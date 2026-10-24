import { join } from "node:path";
import { buildRegistries, seededRandom, type Config } from "@horde/shared";
import { loadConfig } from "../../src/config/load.js";
import { runTick } from "../../src/world/loop.js";
import { World, type Army } from "../../src/world/world.js";

export { seededRandom };

export const sharedConfigDir = join(
  import.meta.dirname,
  "../../../shared/config",
);

export interface Bench {
  config: Config;
  world: World;
  addArmy: (x: number, y: number, name?: string) => Army;
  step: (ticks?: number) => void;
}

export const createBench = (
  patch: (config: Config) => void = () => undefined,
  seed = 1,
): Bench => {
  const config = loadConfig(sharedConfigDir);
  patch(config);
  const world = new World(config, buildRegistries(config), seededRandom(seed));
  return {
    config,
    world,
    addArmy: (x, y, name = "Ash") => world.addArmy(name, x, y),
    step: (ticks = 1) => {
      for (let index = 0; index < ticks; index++) {
        runTick(world, 1 / config.network.tickRate);
      }
    },
  };
};
