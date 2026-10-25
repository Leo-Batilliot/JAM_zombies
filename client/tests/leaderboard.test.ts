import { describe, expect, test } from "vitest";
import { leaderboardRows } from "../src/leaderboard.js";

const leaderboard = (rank: number) => ({
  rank,
  total: 12,
  entries: [
    { army: 4, name: "Liz", strength: 30, potential: 30 },
    { army: 2, name: "Ash", strength: 12, potential: 20 },
    { army: 5, name: "Ed", strength: 1, potential: 1 },
  ],
  bounty: { army: 4, x: 10, y: 20 },
});

describe("leaderboardRows", () => {
  test("highlights the player in the top", () => {
    expect(leaderboardRows(leaderboard(2), 2, 12, 2)).toEqual([
      { rank: 1, name: "Liz", strength: 30, self: false },
      { rank: 2, name: "Ash", strength: 12, self: true },
    ]);
  });

  test("adds the player below the top with its rank", () => {
    const rows = leaderboardRows(leaderboard(9), 7, 3, 2);
    expect(rows).toHaveLength(3);
    expect(rows[2]).toEqual({ rank: 9, name: "You", strength: 3, self: true });
  });
});
