import type { LeaderboardEntry } from "@horde/shared";
import { armyStrength } from "../systems/strength.js";
import type { Army, World } from "../world/world.js";

export interface Ranking {
  entries: LeaderboardEntry[];
  ranks: Map<Army, number>;
  total: number;
}

export const rankArmies = (world: World): Ranking => {
  const ranked = [...world.armies.values()]
    .map((army) => ({ army, strength: armyStrength(world, army) }))
    .sort((a, b) => b.strength - a.strength || a.army.slot - b.army.slot);
  return {
    entries: ranked
      .slice(0, world.config.lobby.leaderboard.size)
      .map(({ army, strength }) => ({
        army: army.slot,
        name: army.name,
        strength,
      })),
    ranks: new Map(ranked.map(({ army }, index) => [army, index + 1])),
    total: ranked.length,
  };
};
