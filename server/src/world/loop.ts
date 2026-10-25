import { runBots } from "../lobby/bots.js";
import { updateLobby } from "../lobby/lobby.js";
import { maintainPopulations, moveCivilians } from "../systems/civilians.js";
import { updateBattles } from "../systems/battle.js";
import { fleeBattles } from "../systems/flee.js";
import { runBombings } from "../systems/bombings.js";
import { fight } from "../systems/combat.js";
import { maintainCamps } from "../systems/camps.js";
import { maintainCrosses, updateCrosses } from "../systems/crosses.js";
import { clearFound, equipArmies } from "../systems/equipment.js";
import { runEvents } from "../systems/events.js";
import { updateHostiles } from "../systems/hostiles.js";
import { fuseArmies } from "../systems/evolution.js";
import { healTroops } from "../systems/gifts.js";
import { regenerateMages, respawnMages, trackRuns } from "../systems/mage.js";
import { expireWalls } from "../systems/spells.js";
import { maintainMists, updateMists } from "../systems/mists.js";
import { maintainPoints, searchPoints } from "../systems/points.js";
import { moveProjectiles } from "../systems/projectiles.js";
import { followMages } from "../systems/formation.js";
import { moveMages } from "../systems/movement.js";
import { reanimate } from "../systems/reanimation.js";
import { separateBodies } from "../systems/separation.js";
import { updateTargets } from "../systems/targeting.js";
import type { World } from "./world.js";

export type System = (world: World, dt: number) => void;

export const systems: System[] = [
  clearFound,
  updateLobby,
  runBots,
  maintainPopulations,
  runEvents,
  moveCivilians,
  moveMages,
  updateTargets,
  followMages,
  updateHostiles,
  separateBodies,
  fight,
  moveProjectiles,
  updateMists,
  runBombings,
  updateCrosses,
  updateBattles,
  fleeBattles,
  reanimate,
  regenerateMages,
  healTroops,
  fuseArmies,
  searchPoints,
  equipArmies,
  maintainPoints,
  maintainCrosses,
  maintainMists,
  maintainCamps,
  expireWalls,
  respawnMages,
  trackRuns,
];

export const runTick = (world: World, dt: number): void => {
  for (const system of systems) {
    system(world, dt);
  }
  world.tick++;
  world.time += dt;
};

export interface TickStats {
  lastMs: number;
  maxMs: number;
  totalMs: number;
  ticks: number;
}

export interface Loop {
  stats: TickStats;
  stop: () => void;
}

export const startLoop = (world: World, afterTick: () => void): Loop => {
  const stats: TickStats = { lastMs: 0, maxMs: 0, totalMs: 0, ticks: 0 };
  let next = performance.now();
  let timer: NodeJS.Timeout | undefined;
  let stopped = false;

  const run = (): void => {
    const intervalMs = 1000 / world.config.network.tickRate;
    const start = performance.now();
    runTick(world, intervalMs / 1000);
    afterTick();
    stats.lastMs = performance.now() - start;
    stats.maxMs = Math.max(stats.maxMs, stats.lastMs);
    stats.totalMs += stats.lastMs;
    stats.ticks++;
    if (stats.lastMs > intervalMs) {
      console.warn(
        `Tick ${String(world.tick)} took ${stats.lastMs.toFixed(1)} ms (budget ${intervalMs.toFixed(1)} ms)`,
      );
    }
    next = Math.max(next + intervalMs, performance.now() - intervalMs);
    if (!stopped) {
      timer = setTimeout(run, next - performance.now());
    }
  };

  timer = setTimeout(run, 0);
  return {
    stats,
    stop: () => {
      stopped = true;
      clearTimeout(timer);
    },
  };
};
