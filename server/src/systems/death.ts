import { EntityKind } from "@horde/shared";
import type { Army, Mage, Npc, Unit, World } from "../world/world.js";
import { damageMage } from "./mage.js";
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
  if (infects && killer !== undefined) {
    world.addUnit(killer, raisedAs, victim.x, victim.y).raisedAt = world.time;
    return;
  }
  const corpseOwner = owner ?? killer;
  if (corpseOwner !== undefined) {
    world.addCorpse(raisedAs, corpseOwner, killer, victim.x, victim.y);
  }
};

export const damage = (
  world: World,
  target: Mage | Unit | Npc,
  amount: number,
  attacker: Army | undefined,
): void => {
  if (target.kind === EntityKind.Mage) {
    damageMage(world, target, amount, attacker);
    return;
  }
  target.hp -= amount;
  if (target.hp <= 0) {
    kill(world, target, attacker);
  }
};
