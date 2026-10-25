import type { Corpse, World } from "../world/world.js";
import { enlistNearMage } from "./enlist.js";

export const corpseDelay = (world: World, corpse: Corpse): number =>
  corpse.sacred
    ? world.config.gameplay.reanimation.crossDelaySec
    : world.config.gameplay.reanimation.delaySec;

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
