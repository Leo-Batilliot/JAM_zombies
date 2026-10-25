import { distanceToMages, farPoint } from "../world/spawn.js";
import type { Army, BossEvent, Npc, World } from "../world/world.js";
import { drawLoot, drawWeighted, grantItem } from "./equipment.js";
import { grantSouls } from "./souls.js";
import { armyStrength } from "./strength.js";

const eventState = (world: World, type: string): BossEvent => {
  let state = world.events.get(type);
  if (state === undefined) {
    state = {
      type,
      nextAt: world.time + world.registries.events.get(type).firstDelaySec,
      boss: undefined,
      minions: new Set(),
      endsAt: 0,
      summonAt: 0,
      contributions: new Map(),
      result: undefined,
    };
    world.events.set(type, state);
  }
  return state;
};

const shareRewards = (
  world: World,
  state: BossEvent,
  souls: number,
): Map<Army, number> => {
  const rewards = new Map<Army, number>();
  let total = 0;
  for (const contribution of state.contributions.values()) {
    total += contribution;
  }
  if (total <= 0) {
    return rewards;
  }
  for (const [army, contribution] of state.contributions) {
    if (world.armies.get(army.slot) !== army) {
      continue;
    }
    const reward = (souls * contribution) / total;
    grantSouls(world, army, reward);
    rewards.set(army, reward);
  }
  return rewards;
};

const shareItems = (world: World, state: BossEvent): void => {
  const event = world.registries.events.get(state.type);
  const receivers = new Map<Army, number>();
  for (const [army, contribution] of state.contributions) {
    if (
      contribution > 0 &&
      army.alive &&
      world.armies.get(army.slot) === army
    ) {
      receivers.set(army, contribution);
      const item = drawLoot(world, event.rewardLoot);
      if (item !== undefined) {
        grantItem(world, army, item);
      }
    }
  }
  const [winner] =
    drawWeighted(world, [...receivers], ([, contribution]) => contribution) ??
    [];
  if (winner !== undefined) {
    grantItem(world, winner, event.rewardLegendary);
  }
};

export const endEvent = (
  world: World,
  state: BossEvent,
  defeated: boolean,
): void => {
  const event = world.registries.events.has(state.type)
    ? world.registries.events.get(state.type)
    : undefined;
  if (state.boss !== undefined && world.entities.has(state.boss.id)) {
    world.removeEntity(state.boss);
  }
  for (const minion of state.minions) {
    world.removeEntity(minion);
  }
  state.result = {
    defeated,
    rewards:
      defeated && event !== undefined
        ? shareRewards(world, state, event.rewardSouls)
        : new Map<Army, number>(),
  };
  if (defeated && event !== undefined) {
    shareItems(world, state);
  }
  state.boss = undefined;
  state.minions.clear();
  state.contributions = new Map();
  state.nextAt = world.time + (event?.intervalSec ?? 0);
};

export const startEvent = (
  world: World,
  type: string,
  x: number,
  y: number,
): BossEvent => {
  const state = eventState(world, type);
  if (state.boss !== undefined) {
    endEvent(world, state, false);
  }
  const event = world.registries.events.get(type);
  state.boss = world.addEventNpc(event.boss, x, y, type);
  state.endsAt = world.time + event.lifetimeSec;
  state.summonAt = world.time;
  state.result = undefined;
  return state;
};

const summon = (world: World, state: BossEvent, boss: Npc): void => {
  const event = world.registries.events.get(state.type);
  const count = Math.min(
    event.summonCount,
    event.maxMinions - state.minions.size,
  );
  for (let index = 0; index < count; index++) {
    const { x, y } = world.randomNear(boss.x, boss.y, event.summonRadius);
    state.minions.add(world.addEventNpc(event.minion, x, y, state.type));
  }
  state.summonAt = world.time + event.summonIntervalSec;
};

export const runEvents = (world: World): void => {
  for (const state of world.events.values()) {
    if (!world.registries.events.has(state.type) && state.boss !== undefined) {
      endEvent(world, state, false);
    }
  }
  for (const [type, event] of world.registries.events.entries()) {
    const state = eventState(world, type);
    if (state.boss === undefined && world.time >= state.nextAt) {
      const { x, y } = farPoint(
        world,
        (px, py) => distanceToMages(world, px, py),
        event.safeDistance,
        event.districts,
      );
      startEvent(world, type, x, y);
    }
    const { boss } = state;
    if (boss === undefined) {
      continue;
    }
    if (world.time >= state.endsAt) {
      endEvent(world, state, false);
    } else if (world.time >= state.summonAt) {
      summon(world, state, boss);
    }
  }
};

export const recordContribution = (
  world: World,
  target: Npc,
  army: Army,
  amount: number,
): void => {
  const state =
    target.event === undefined ? undefined : world.events.get(target.event);
  if (state?.boss !== target) {
    return;
  }
  const share = amount / Math.max(1, armyStrength(world, army));
  state.contributions.set(army, (state.contributions.get(army) ?? 0) + share);
};

export const eventNpcKilled = (world: World, npc: Npc): void => {
  const state =
    npc.event === undefined ? undefined : world.events.get(npc.event);
  if (state === undefined) {
    return;
  }
  if (state.boss === npc) {
    endEvent(world, state, true);
  } else {
    state.minions.delete(npc);
  }
};
