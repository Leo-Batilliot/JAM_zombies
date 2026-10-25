import type { Corpse, World } from "../world/world.js";
import { enlistNearMage } from "./enlist.js";
import { mistDelay } from "./mists.js";

export const corpseDelay = (world: World, corpse: Corpse): number => {
  const { crossDelaySec, delaySec } = world.config.gameplay.reanimation;
  if (corpse.sacred) {
    return crossDelaySec;
  }
  return Math.min(delaySec, mistDelay(world, corpse.x, corpse.y) ?? Infinity);
};

export const reanimate = (world: World): void => {
  for (const army of world.armies.values()) {
    if (!army.alive || army.battle !== undefined) {
      continue;
    }
    for (const corpse of army.corpses) {
      if (
        corpse.group !== undefined ||
        world.time - corpse.diedAt < corpseDelay(world, corpse)
      ) {
        continue;
      }
      world.removeEntity(corpse);
      enlistNearMage(world, army, corpse);
    }
  }
};
