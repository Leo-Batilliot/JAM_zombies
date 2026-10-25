import { EntityKind } from "@horde/shared";
import type { Army, Npc, World } from "../world/world.js";
import { distance, isFixedNpc } from "./bodies.js";

const isPrey = (world: World, npc: Npc): boolean =>
  !world.registries.npcs.get(npc.type).obstacle && !isFixedNpc(world, npc);

const magicTarget = (world: World, army: Army): Npc | undefined => {
  const { range } = world.config.gameplay.mage.attack;
  const { mage } = army;
  const focus =
    army.focusId === undefined ? undefined : world.entities.get(army.focusId);
  if (
    focus?.kind === EntityKind.Npc &&
    isPrey(world, focus) &&
    distance(focus, mage) <= range
  ) {
    return focus;
  }
  let best: Npc | undefined;
  for (const id of world.grid.queryRadius(mage.x, mage.y, range)) {
    const entity = world.entities.get(id);
    if (
      entity?.kind === EntityKind.Npc &&
      isPrey(world, entity) &&
      (best === undefined || distance(entity, mage) < distance(best, mage))
    ) {
      best = entity;
    }
  }
  return best;
};

export const castMagic = (world: World): void => {
  const { damage, intervalSec, projectile } = world.config.gameplay.mage.attack;
  for (const army of world.armies.values()) {
    const { mage } = army;
    if (!army.alive || world.time < (world.abilityAt.get(mage.id) ?? 0)) {
      continue;
    }
    const target = magicTarget(world, army);
    if (target !== undefined) {
      world.abilityAt.set(mage.id, world.time + intervalSec);
      world.addProjectile(projectile, mage, target.id, damage, army, army.name);
    }
  }
};
