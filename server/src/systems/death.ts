import { EntityKind } from "@horde/shared";
import { isCapped } from "../lobby/handicap.js";
import type { Army, Mage, Npc, Unit, World } from "../world/world.js";
import { eventNpcKilled, recordContribution } from "./events.js";
import { enlist } from "./enlist.js";
import { giftValue } from "./gifts.js";
import { armorOf } from "./equipment.js";
import { damageMage, nearestGuard } from "./mage.js";
import { grantSouls } from "./souls.js";
import { effectsOf } from "./tactics.js";

const victimProfile = (world: World, victim: Unit | Npc) => {
  if (victim.kind === EntityKind.Unit) {
    return {
      strength: world.registries.units.get(victim.type).strength,
      owner: victim.army,
      raisedAs: victim.type,
      infects: false,
    };
  }
  const npc = world.registries.npcs.get(victim.type);
  return {
    strength: npc.strength,
    owner: undefined,
    raisedAs: npc.corpse,
    infects: npc.infects,
  };
};

export const kill = (
  world: World,
  victim: Unit | Npc,
  killer: Army | undefined,
  sacred = false,
): void => {
  const { strength, owner, raisedAs, infects } = victimProfile(world, victim);
  if (killer !== undefined) {
    killer.run.kills++;
    grantSouls(
      world,
      killer,
      strength * world.config.gameplay.souls.perStrength,
    );
  }
  world.removeEntity(victim);
  if (victim.kind === EntityKind.Npc && victim.event !== undefined) {
    eventNpcKilled(world, victim);
  }
  if (
    raisedAs === undefined ||
    (owner === undefined && killer !== undefined && isCapped(killer))
  ) {
    return;
  }
  if (infects && killer !== undefined) {
    killer.run.infected++;
    enlist(
      world,
      killer,
      { type: raisedAs, item: undefined },
      victim.x,
      victim.y,
    );
    return;
  }
  const corpseOwner = owner ?? killer;
  if (corpseOwner === undefined) {
    return;
  }
  const corpse = world.addCorpse(
    raisedAs,
    corpseOwner,
    killer,
    victim.x,
    victim.y,
    victim.kind === EntityKind.Unit ? victim.item : undefined,
  );
  corpse.sacred = sacred;
  if (victim.kind === EntityKind.Unit && victim.group !== undefined) {
    corpse.group = victim.group;
    victim.group.corpses.add(corpse);
  }
};

export const damage = (
  world: World,
  target: Mage | Unit | Npc,
  amount: number,
  attacker: Army | undefined,
  attackerName = attacker?.name ?? "",
): void => {
  if (target.kind === EntityKind.Mage) {
    const guard = nearestGuard(world, target);
    const share = Math.min(
      1,
      world.config.gameplay.soulLink.share +
        giftValue(world, target.army, "soulLink"),
    );
    const shared = guard === undefined ? 0 : amount * share;
    if (guard !== undefined) {
      damage(world, guard, shared, attacker, attackerName);
    }
    damageMage(world, target, amount - shared, attacker, attackerName);
    return;
  }
  if (target.kind === EntityKind.Npc && attacker !== undefined) {
    recordContribution(world, target, attacker, amount);
  }
  target.hp -=
    target.kind === EntityKind.Unit
      ? amount *
        (1 - effectsOf(world, target.army).defense) *
        (1 - armorOf(world, target))
      : amount;
  if (target.hp <= 0) {
    kill(world, target, attacker);
  }
};
