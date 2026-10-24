import type { World } from "../world/world.js";

export const reanimate = (world: World): void => {
  const { delaySec, raiseRadius } = world.config.gameplay.reanimation;
  for (const army of world.armies.values()) {
    if (!army.alive || army.battle !== undefined) {
      continue;
    }
    for (const corpse of army.corpses) {
      if (corpse.group !== undefined || world.time - corpse.diedAt < delaySec) {
        continue;
      }
      const { x, y } = world.randomNear(army.mage.x, army.mage.y, raiseRadius);
      world.removeEntity(corpse);
      world.addUnit(army, corpse.type, x, y).raisedAt = world.time;
    }
  }
};
