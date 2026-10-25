import type { LeaderboardEntry } from "@horde/shared";
import type { Leaderboard } from "./net/connection.js";

export interface LeaderboardRow {
  rank: number;
  name: string;
  strength: number;
  self: boolean;
}

export const leaderboardRows = (
  leaderboard: Leaderboard,
  ownArmy: number | undefined,
  ownStrength: number,
  size: number,
): LeaderboardRow[] => {
  const rows = leaderboard.entries
    .slice(0, size)
    .map((entry: LeaderboardEntry, index): LeaderboardRow => ({
      rank: index + 1,
      name: entry.name,
      strength: entry.strength,
      self: entry.army === ownArmy,
    }));
  if (!rows.some((row) => row.self) && leaderboard.rank > rows.length) {
    rows.push({
      rank: leaderboard.rank,
      name: "You",
      strength: ownStrength,
      self: true,
    });
  }
  return rows;
};
