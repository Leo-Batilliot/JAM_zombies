import type { Army, Battle, World } from "../world/world.js";
import { enclose, nearestFoe } from "./battle.js";
import { currentTarget } from "./targeting.js";
import { receiver, transferCorpse } from "./transfer.js";

const abandon = (world: World, army: Army): void => {
  const contact = [...army.units].filter(
    (unit) =>
      unit.group === undefined &&
      unit.fighting &&
      currentTarget(world, unit) !== undefined &&
      world.registries.units.get(unit.type).projectile === undefined,
  );
  if (contact.length === 0) {
    return;
  }
  const { x, y } = enclose(army, contact);
  const group = {
    army,
    units: new Set(contact),
    corpses: new Set<never>(),
    anchorX: x,
    anchorY: y,
    engagedAt: world.time,
  };
  for (const unit of contact) {
    unit.group = group;
    unit.returning = false;
  }
  army.groups.add(group);
};

const handOverCorpses = (world: World, army: Army, battle: Battle): void => {
  const foes = new Set<Army>();
  for (const foe of battle.foes) {
    if (foe.army !== undefined) {
      foes.add(foe.army);
    }
  }
  for (const corpse of [...army.corpses]) {
    if (
      corpse.group === undefined &&
      corpse.killer !== undefined &&
      foes.has(corpse.killer)
    ) {
      const to = receiver(world, corpse.killer, army);
      if (to !== undefined) {
        transferCorpse(corpse, to);
      }
    }
  }
};

export const flee = (world: World, army: Army, battle: Battle): void => {
  abandon(world, army);
  handOverCorpses(world, army, battle);
  army.focusId = undefined;
  army.battle = undefined;
};

export const fleeBattles = (world: World): void => {
  const { fleeDistance } = world.config.gameplay.battle;
  for (const army of world.armies.values()) {
    const { battle } = army;
    if (!army.alive || battle === undefined) {
      continue;
    }
    const nearest = nearestFoe(army, battle.foes);
    if (Number.isFinite(nearest) && nearest - battle.closest >= fleeDistance) {
      flee(world, army, battle);
    }
  }
};
