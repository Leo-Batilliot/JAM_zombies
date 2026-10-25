import { EntityKind } from "@horde/shared";
import { enclose, mainBodies } from "../systems/battle.js";
import { distance } from "../systems/bodies.js";
import { isReady } from "../systems/crosses.js";
import { orderAttack, orderCard, orderMove } from "../systems/orders.js";
import { armyStrength, bodiesStrength } from "../systems/strength.js";
import { orderFormation } from "../systems/tactics.js";
import type {
  Army,
  Battle,
  Camp,
  Entity,
  PointOfInterest,
  World,
} from "../world/world.js";
import { growthFactor, isCapped } from "./handicap.js";
import { rankArmies } from "./leaderboard.js";

type Mode = keyof World["config"]["lobby"]["bots"]["formations"];

const setFormation = (world: World, army: Army, mode: Mode): void => {
  orderFormation(world, army, world.config.lobby.bots.formations[mode]);
};

const nearestPoint = (
  world: World,
  army: Army,
  range: number,
): PointOfInterest | undefined => {
  let best: PointOfInterest | undefined;
  for (const point of world.points) {
    if (
      !point.searchedBy.has(army) &&
      distance(point, army.mage) <= range &&
      (best === undefined ||
        distance(point, army.mage) < distance(best, army.mage))
    ) {
      best = point;
    }
  }
  return best;
};

const nearestCivilian = (
  world: World,
  army: Army,
  range: number,
): Entity | undefined => {
  let best: Entity | undefined;
  for (const id of world.grid.queryRadius(army.mage.x, army.mage.y, range)) {
    const entity = world.entities.get(id);
    if (
      entity?.kind === EntityKind.Npc &&
      world.registries.npcs.get(entity.type).attack === undefined &&
      (best === undefined ||
        distance(entity, army.mage) < distance(best, army.mage))
    ) {
      best = entity;
    }
  }
  return best;
};

const engage = (world: World, army: Army, battle: Battle): void => {
  const { fleeRatio, fleeDistance } = world.config.lobby.bots;
  const own = bodiesStrength(world, mainBodies(army));
  const foeBodies = battle.foes.flatMap((foe) => foe.bodies);
  const foes = bodiesStrength(world, foeBodies);
  if (foes <= own * fleeRatio || foeBodies.length === 0) {
    setFormation(world, army, foes > own ? "defend" : "attack");
    return;
  }
  const center = enclose(undefined, foeBodies);
  const dx = army.mage.x - center.x;
  const dy = army.mage.y - center.y;
  const length = Math.hypot(dx, dy) || 1;
  orderMove(
    world,
    army,
    army.mage.x + (dx / length) * fleeDistance,
    army.mage.y + (dy / length) * fleeDistance,
  );
};

const isIgnored = (world: World, army: Army, prey: Army): boolean =>
  (army.bot?.ignored.get(prey) ?? -Infinity) > world.time;

const giveUpDelay = (world: World, army: Army, prey: Army): number => {
  const { giveUp, attackRatio } = world.config.lobby.bots;
  const own = armyStrength(world, army) * attackRatio;
  const ratio = own > 0 ? armyStrength(world, prey) / own : 1;
  return Math.min(
    giveUp.maxSec,
    Math.max(giveUp.minSec, giveUp.maxSec * ratio),
  );
};

const pursue = (
  world: World,
  army: Army,
  prey: Army | undefined,
): Army | undefined => {
  const { bot } = army;
  for (const [ignored, until] of bot?.ignored ?? []) {
    if (until <= world.time) {
      bot?.ignored.delete(ignored);
    }
  }
  if (bot === undefined || prey === undefined) {
    if (bot !== undefined) {
      bot.chase = undefined;
    }
    return prey;
  }
  if (bot.chase?.prey !== prey) {
    bot.chase = { prey, since: world.time };
  }
  if (world.time - bot.chase.since < giveUpDelay(world, army, prey)) {
    return prey;
  }
  bot.ignored.set(prey, world.time + world.config.lobby.bots.giveUp.ignoreSec);
  bot.chase = undefined;
  return undefined;
};

const weakerArmy = (world: World, army: Army): Army | undefined => {
  const { attackRange, attackRatio } = world.config.lobby.bots;
  const own = armyStrength(world, army);
  let best: Army | undefined;
  let bestDistance = attackRange;
  for (const other of world.armies.values()) {
    if (other === army || !other.alive || isIgnored(world, army, other)) {
      continue;
    }
    const otherDistance = distance(other.mage, army.mage);
    if (
      otherDistance <= bestDistance &&
      armyStrength(world, other) < own * attackRatio
    ) {
      best = other;
      bestDistance = otherDistance;
    }
  }
  return best;
};

const bountyTarget = (world: World, army: Army): Army | undefined => {
  const { bountyRange, bountyRatio } = world.config.lobby.bots;
  const [leader] = rankArmies(world).entries;
  const target =
    leader === undefined ? undefined : world.armies.get(leader.army);
  if (
    leader === undefined ||
    target === undefined ||
    target === army ||
    !target.alive ||
    isIgnored(world, army, target) ||
    leader.strength <= 0 ||
    leader.strength > armyStrength(world, army) * bountyRatio ||
    distance(target.mage, army.mage) > bountyRange
  ) {
    return undefined;
  }
  return target;
};

const campTarget = (world: World, army: Army): Camp | undefined => {
  const { campRange, campRatio } = world.config.lobby.bots;
  const own = armyStrength(world, army);
  let best: Camp | undefined;
  let bestDistance = campRange;
  for (const camp of world.camps) {
    const campDistance = distance(camp, army.mage);
    if (
      campDistance <= bestDistance &&
      own >= bodiesStrength(world, camp.defenders) * campRatio
    ) {
      best = camp;
      bestDistance = campDistance;
    }
  }
  return best;
};

const closestOnPath = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  point: { x: number; y: number },
): { x: number; y: number } => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  const t =
    length === 0
      ? 0
      : Math.min(
          Math.max(
            ((point.x - from.x) * dx + (point.y - from.y) * dy) / length,
            0,
          ),
          1,
        );
  return { x: from.x + dx * t, y: from.y + dy * t };
};

export const detour = (
  world: World,
  army: Army,
  x: number,
  y: number,
): { x: number; y: number } => {
  const { radius, threshold } = world.config.world.crosses;
  if (armyStrength(world, army) < threshold) {
    return { x, y };
  }
  const reach = radius + world.config.lobby.bots.crossMargin;
  const target = { x, y };
  for (const cross of world.crosses) {
    if (!isReady(world, cross)) {
      continue;
    }
    const closest = closestOnPath(army.mage, target, cross);
    const gap = Math.hypot(closest.x - cross.x, closest.y - cross.y);
    if (gap >= reach) {
      continue;
    }
    const dx = target.x - army.mage.x;
    const dy = target.y - army.mage.y;
    const length = Math.hypot(dx, dy) || 1;
    const side =
      gap > 0
        ? { x: (closest.x - cross.x) / gap, y: (closest.y - cross.y) / gap }
        : { x: -dy / length, y: dx / length };
    return {
      x: world.clampX(cross.x + side.x * reach),
      y: world.clampY(cross.y + side.y * reach),
    };
  }
  return target;
};

const moveTo = (world: World, army: Army, x: number, y: number): void => {
  const point = detour(world, army, x, y);
  orderMove(world, army, point.x, point.y);
};

export const lineageNeeds = (
  world: World,
  army: Army,
): Map<string, { waiting: number; strength: number }> => {
  const needs = new Map<string, { waiting: number; strength: number }>();
  for (const unit of army.units) {
    const node = world.registries.tree.get(unit.type);
    if (node === undefined) {
      continue;
    }
    const need = needs.get(node.lineage) ?? { waiting: 0, strength: 0 };
    if (node.tier >= (army.mutations.get(node.lineage)?.tier ?? 0)) {
      need.waiting++;
    }
    need.strength += world.registries.units.get(unit.type).strength;
    needs.set(node.lineage, need);
  }
  return needs;
};

const pickCard = (world: World, army: Army): void => {
  if (army.cards.length === 0) {
    return;
  }
  const needs = lineageNeeds(world, army);
  const score = (unit: string): [number, number] => {
    const lineage = world.registries.tree.get(unit)?.lineage ?? "";
    const need = needs.get(lineage);
    return [need?.waiting ?? 0, need?.strength ?? 0];
  };
  let mutation = -1;
  army.cards.forEach((card, index) => {
    const best = army.cards[mutation];
    if (card.kind !== "mutation" || score(card.unit)[0] === 0) {
      return;
    }
    if (best?.kind !== "mutation") {
      mutation = index;
      return;
    }
    const [waiting, strength] = score(card.unit);
    const [bestWaiting, bestStrength] = score(best.unit);
    if (
      waiting > bestWaiting ||
      (waiting === bestWaiting && strength > bestStrength)
    ) {
      mutation = index;
    }
  });
  const gift = army.cards.findIndex((card) => card.kind === "gift");
  orderCard(world, army, mutation >= 0 ? mutation : Math.max(gift, 0));
};

const unstuck = (world: World, army: Army): boolean => {
  const { bot, mage } = army;
  if (bot === undefined) {
    return false;
  }
  const { distance: minimum, detour } = world.config.lobby.bots.stuck;
  const moved = Math.hypot(mage.x - bot.lastX, mage.y - bot.lastY);
  bot.lastX = mage.x;
  bot.lastY = mage.y;
  const dx = mage.targetX - mage.x;
  const dy = mage.targetY - mage.y;
  const remaining = Math.hypot(dx, dy);
  if (!(moved < minimum) || remaining <= 2 * minimum) {
    return false;
  }
  const side = world.random() < 0.5 ? -1 : 1;
  orderMove(
    world,
    army,
    mage.x + ((dx / remaining) * detour) / 2 - (dy / remaining) * detour * side,
    mage.y + ((dy / remaining) * detour) / 2 + (dx / remaining) * detour * side,
  );
  return true;
};

const think = (world: World, army: Army): void => {
  const { wanderDistance, huntRange, lootRange } = world.config.lobby.bots;
  const { mage } = army;
  if (army.battle === undefined && unstuck(world, army)) {
    return;
  }
  if (army.battle !== undefined) {
    engage(world, army, army.battle);
    return;
  }
  pickCard(world, army);
  if (isCapped(army)) {
    setFormation(world, army, "explore");
    if (mage.x === mage.targetX && mage.y === mage.targetY) {
      const { x, y } = world.randomNear(mage.x, mage.y, wanderDistance);
      moveTo(world, army, x, y);
    }
    return;
  }
  const prey = pursue(
    world,
    army,
    bountyTarget(world, army) ?? weakerArmy(world, army),
  );
  const target = prey?.mage ?? campTarget(world, army);
  if (target !== undefined) {
    setFormation(world, army, "attack");
    moveTo(world, army, target.x, target.y);
    return;
  }
  setFormation(world, army, "explore");
  const point = nearestPoint(world, army, lootRange);
  if (point !== undefined) {
    moveTo(world, army, point.x, point.y);
    return;
  }
  const civilian = nearestCivilian(world, army, huntRange);
  if (civilian !== undefined) {
    moveTo(world, army, civilian.x, civilian.y);
    orderAttack(world, army, civilian.id);
    return;
  }
  if (mage.x === mage.targetX && mage.y === mage.targetY) {
    const { x, y } = world.randomNear(mage.x, mage.y, wanderDistance);
    moveTo(world, army, x, y);
  }
};

export const runBots = (world: World): void => {
  const { thinkIntervalSec, handicap } = world.config.lobby.bots;
  for (const army of world.armies.values()) {
    if (
      army.bot === undefined ||
      !army.alive ||
      world.time < army.bot.thinkAt
    ) {
      continue;
    }
    const slowdown =
      1 + (handicap.thinkSlowdown - 1) * (1 - growthFactor(army));
    army.bot.thinkAt =
      world.time + thinkIntervalSec * slowdown * (0.5 + world.random());
    think(world, army);
  }
};
