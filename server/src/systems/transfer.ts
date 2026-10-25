import { isCapped } from "../lobby/handicap.js";
import type { Army, Corpse, Unit, World } from "../world/world.js";

export const receiver = (
  world: World,
  army: Army | undefined,
  from: Army,
): Army | undefined =>
  army !== undefined &&
  army !== from &&
  army.alive &&
  !isCapped(army) &&
  world.armies.get(army.slot) === army
    ? army
    : undefined;

export const transferUnit = (unit: Unit, to: Army): void => {
  unit.army.units.delete(unit);
  unit.group?.units.delete(unit);
  unit.group = undefined;
  unit.army = to;
  unit.targetId = undefined;
  unit.returning = false;
  to.units.add(unit);
};

export const transferCorpse = (corpse: Corpse, to: Army): void => {
  corpse.owner.corpses.delete(corpse);
  corpse.group?.corpses.delete(corpse);
  corpse.group = undefined;
  corpse.owner = to;
  corpse.killer = undefined;
  to.corpses.add(corpse);
};

export const transferToKiller = (world: World, corpse: Corpse): void => {
  const to = receiver(world, corpse.killer, corpse.owner);
  if (to === undefined) {
    corpse.group?.corpses.delete(corpse);
    corpse.group = undefined;
  } else {
    transferCorpse(corpse, to);
  }
};
