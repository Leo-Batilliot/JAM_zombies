import { farPoint } from "../world/spawn.js";
import type { Army, Mage, World } from "../world/world.js";
import { addStartingUnits } from "./army.js";
import { maxHp } from "./souls.js";
import { armyStrength } from "./strength.js";

export const killMage = (
  world: World,
  army: Army,
  killer: Army | undefined,
  killerName = killer?.name ?? "",
): void => {
  world.clearArmy(army);
  army.alive = false;
  army.respawnAt = world.time + world.config.gameplay.respawn.delaySec;
  army.deaths++;
  army.killerName = killerName;
  army.souls = 0;
  army.level = 1;
  army.focusId = undefined;
  army.search = undefined;
};

export const damageMage = (
  world: World,
  mage: Mage,
  amount: number,
  attacker: Army | undefined,
  attackerName = attacker?.name ?? "",
): void => {
  mage.hp -= amount;
  mage.hitAt = world.time;
  if (mage.hp <= 0) {
    killMage(world, mage.army, attacker, attackerName);
  }
};

const distanceToBigArmies = (world: World, x: number, y: number): number => {
  const { bigArmyStrength } = world.config.gameplay.respawn;
  let nearest = Infinity;
  for (const army of world.armies.values()) {
    if (army.alive && armyStrength(world, army) >= bigArmyStrength) {
      nearest = Math.min(nearest, Math.hypot(army.mage.x - x, army.mage.y - y));
    }
  }
  return nearest;
};

export const respawnMage = (world: World, army: Army): void => {
  const { x, y } = farPoint(
    world,
    (px, py) => distanceToBigArmies(world, px, py),
    world.config.gameplay.respawn.safeDistance,
  );
  world.placeMage(army, x, y);
  army.alive = true;
  army.mage.hp = maxHp(world, army);
  army.mage.hitAt = -Infinity;
  addStartingUnits(world, army);
};

export const respawnMages = (world: World): void => {
  for (const army of world.armies.values()) {
    if (!army.alive && world.time >= army.respawnAt) {
      respawnMage(world, army);
    }
  }
};

export const regenerateMages = (world: World, dt: number): void => {
  const { regenDelaySec, regenPerSec } = world.config.gameplay.mage;
  for (const army of world.armies.values()) {
    const { mage } = army;
    if (army.alive && world.time - mage.hitAt >= regenDelaySec) {
      mage.hp = Math.min(maxHp(world, army), mage.hp + regenPerSec * dt);
    }
  }
};
