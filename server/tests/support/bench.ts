import { join } from "node:path";
import { buildRegistries, seededRandom, type Config } from "@horde/shared";
import { loadConfig } from "../../src/config/load.js";
import { runTick } from "../../src/world/loop.js";
import { World, type Army, type NpcGroup } from "../../src/world/world.js";

export { seededRandom };

export const sharedConfigDir = join(
  import.meta.dirname,
  "../../../shared/config",
);

export interface Bench {
  config: Config;
  world: World;
  addArmy: (x: number, y: number, name?: string) => Army;
  addCivilians: (x: number, y: number, count: number) => NpcGroup;
  step: (ticks?: number) => void;
}

export const createBench = (
  patch: (config: Config) => void = () => undefined,
  seed = 1,
): Bench => {
  const config = loadConfig(sharedConfigDir);
  config.world.populations = [];
  for (const point of Object.values(config.world.pointsOfInterest)) {
    point.count = 0;
  }
  config.world.crosses.count = 0;
  config.world.camps.count = 0;
  for (const mist of Object.values(config.world.mists)) {
    mist.count = 0;
  }
  config.world.bombings.zones = 0;
  config.lobby.minParticipants = 0;
  patch(config);
  const world = new World(config, buildRegistries(config), seededRandom(seed));
  return {
    config,
    world,
    addArmy: (x, y, name = "Ash") => world.addArmy(name, x, y),
    addCivilians: (x, y, count) => {
      const group = world.addNpcGroup(0, x, y);
      for (let index = 0; index < count; index++) {
        world.addNpc(group, "civilian", 0, 0);
      }
      return group;
    },
    step: (ticks = 1) => {
      for (let index = 0; index < ticks; index++) {
        runTick(world, 1 / config.network.tickRate);
      }
    },
  };
};
