import { EntityKind } from "@horde/shared";
import type { Army, Mage, Npc, Unit, World } from "../world/world.js";
import { eventNpcKilled, recordContribution } from "./events.js";
import { damageMage, nearestGuard } from "./mage.js";
import { grantSouls } from "./souls.js";

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
): void => {
  const { strength, owner, raisedAs, infects } = victimProfile(world, victim);
  if (killer !== undefined) {
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
  if (raisedAs === undefined) {
    return;
  }
  if (infects && killer !== undefined) {
    world.addUnit(killer, raisedAs, victim.x, victim.y).raisedAt = world.time;
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
  );
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
    const shared =
      guard === undefined ? 0 : amount * world.config.gameplay.soulLink.share;
    if (guard !== undefined) {
      damage(world, guard, shared, attacker, attackerName);
    }
    damageMage(world, target, amount - shared, attacker, attackerName);
    return;
  }
  if (target.kind === EntityKind.Npc && attacker !== undefined) {
    recordContribution(world, target, attacker, amount);
  }
  target.hp -= amount;
  if (target.hp <= 0) {
    kill(world, target, attacker);
  }
};
