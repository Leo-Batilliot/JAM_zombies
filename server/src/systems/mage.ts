import { EntityKind } from "@horde/shared";
import { rankArmies } from "../lobby/leaderboard.js";
import { farPoint } from "../world/spawn.js";
import type {
  Army,
  Corpse,
  Entity,
  Mage,
  Remains,
  Unit,
  World,
} from "../world/world.js";
import { addStartingUnits } from "./army.js";
import { distance } from "./bodies.js";
import { enlist, isFull } from "./enlist.js";
import { isAllowed } from "./evolution.js";
import { createMassGrave } from "./points.js";
import { grantSouls, maxHp } from "./souls.js";
import { armyStrength } from "./strength.js";
import { effectsOf } from "./tactics.js";
import { receiver, transferCorpse, transferUnit } from "./transfer.js";

const shuffle = <T>(world: World, items: T[]): T[] => {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(world.random() * (index + 1));
    [items[index], items[other]] = [items[other] as T, items[index] as T];
  }
  return items;
};

const handOver = (world: World, army: Army, killer: Army | undefined): void => {
  const heir = receiver(world, killer, army);
  const remains: (Unit | Corpse)[] = shuffle(world, [
    ...army.units,
    ...army.corpses,
  ]);
  const kept = Math.round(
    remains.length * world.config.gameplay.transfer.share,
  );
  const grave: Remains[] = [];
  remains.forEach((remain, index) => {
    const to =
      remain.kind === EntityKind.Unit
        ? heir
        : (receiver(world, remain.killer, army) ?? heir);
    if (index >= kept || to === undefined) {
      grave.push({ type: remain.type, item: remain.item });
      world.removeEntity(remain);
    } else if (
      remain.kind === EntityKind.Unit &&
      (isFull(world, to) || !isAllowed(world, to, remain.type))
    ) {
      world.removeEntity(remain);
      enlist(world, to, remain, remain.x, remain.y);
    } else if (remain.kind === EntityKind.Unit) {
      transferUnit(remain, to);
    } else {
      transferCorpse(remain, to);
    }
  });
  createMassGrave(world, army.mage.x, army.mage.y, grave);
};

const isBounty = (world: World, army: Army): boolean => {
  const [leader] = rankArmies(world).entries;
  return (
    leader !== undefined && leader.army === army.slot && leader.strength > 0
  );
};

export const killMage = (
  world: World,
  army: Army,
  killer: Army | undefined,
  killerName = killer?.name ?? "",
): void => {
  const hunter = receiver(world, killer, army);
  if (hunter !== undefined) {
    hunter.run.mageKills++;
    if (isBounty(world, army)) {
      grantSouls(world, hunter, world.config.events.bounty.souls);
    }
  }
  army.lastRun = {
    maxPower: army.run.maxPower,
    survivalSec: world.time - army.run.startedAt,
    infected: army.run.infected,
    kills: army.run.kills,
    mageKills: army.run.mageKills,
    level: army.level,
    mutations: army.run.mutations.map((type) =>
      world.registries.units.index(type),
    ),
  };
  handOver(world, army, killer);
  world.clearArmy(army);
  army.alive = false;
  army.respawnAt = world.time + world.config.gameplay.respawn.delaySec;
  army.deaths++;
  army.killerName = killerName;
  army.souls = 0;
  army.level = 1;
  army.focusId = undefined;
  army.search = undefined;
  army.inventory = [];
  army.formation = undefined;
  army.formationReadyAt = 0;
  army.pendingLevels = 0;
  army.cards = [];
  army.mutations.clear();
  army.gifts.clear();
  army.spell = undefined;
  army.spellReadyAt = 0;
  army.rally = { until: 0, multiplier: 1 };
  army.respawnRequested = false;
};

export const damageMage = (
  world: World,
  mage: Mage,
  amount: number,
  attacker: Army | undefined,
  attackerName = attacker?.name ?? "",
): void => {
  if (!mage.army.alive) {
    return;
  }
  const loss = Math.min(amount, mage.lossBudget);
  mage.lossBudget -= loss;
  mage.hp -= loss;
  mage.hitAt = world.time;
  if (mage.hp <= 0) {
    killMage(world, mage.army, attacker, attackerName);
  }
};

const guardCandidates = (
  world: World,
  mage: Mage,
): Iterable<Entity | undefined> =>
  effectsOf(world, mage.army).fullGuard
    ? mage.army.units
    : world.grid
        .queryRadius(mage.x, mage.y, world.config.gameplay.soulLink.guardRadius)
        .map((id) => world.entities.get(id));

export const nearestGuard = (world: World, mage: Mage): Unit | undefined => {
  let best: Unit | undefined;
  let bestDistance = Infinity;
  for (const unit of guardCandidates(world, mage)) {
    if (
      unit?.kind !== EntityKind.Unit ||
      unit.army !== mage.army ||
      unit.group !== undefined
    ) {
      continue;
    }
    const unitDistance = distance(unit, mage);
    if (unitDistance < bestDistance) {
      best = unit;
      bestDistance = unitDistance;
    }
  }
  return best;
};

const lossCap = (world: World, army: Army): number =>
  maxHp(world, army) * world.config.gameplay.soulLink.maxLossPerSec;

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
  army.mage.lossBudget = lossCap(world, army);
  army.run = world.newRun();
  addStartingUnits(world, army);
};

export const respawnMages = (world: World): void => {
  for (const army of world.armies.values()) {
    if (
      !army.alive &&
      world.time >= army.respawnAt &&
      (army.bot !== undefined || army.respawnRequested)
    ) {
      respawnMage(world, army);
    }
  }
};

export const requestRespawn = (army: Army): void => {
  if (!army.alive) {
    army.respawnRequested = true;
  }
};

export const trackRuns = (world: World): void => {
  for (const army of world.armies.values()) {
    if (army.alive) {
      army.run.maxPower = Math.max(
        army.run.maxPower,
        armyStrength(world, army),
      );
    }
  }
};

export const regenerateMages = (world: World, dt: number): void => {
  const { regenDelaySec, regenPerSec } = world.config.gameplay.mage;
  for (const army of world.armies.values()) {
    const { mage } = army;
    const cap = lossCap(world, army);
    mage.lossBudget = Math.min(cap, mage.lossBudget + cap * dt);
    if (army.alive && world.time - mage.hitAt >= regenDelaySec) {
      mage.hp = Math.min(maxHp(world, army), mage.hp + regenPerSec * dt);
    }
  }
};
