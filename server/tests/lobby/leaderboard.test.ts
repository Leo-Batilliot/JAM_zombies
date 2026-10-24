import { describe, expect, test } from "vitest";
import { rankArmies } from "../../src/lobby/leaderboard.js";
import { createBench } from "../support/bench.js";

describe("rankArmies", () => {
  test("sorts armies by total strength and gives each its rank", () => {
    const { world, addArmy } = createBench((config) => {
      config.lobby.leaderboard.size = 2;
    });
    const small = addArmy(10, 10, "Small");
    const big = addArmy(20, 20, "Big");
    const middle = addArmy(30, 30, "Middle");
    for (let index = 0; index < 3; index++) {
      world.addUnit(big, "zombie", 20, 20);
    }
    world.addUnit(middle, "zombie", 30, 30);
    const ranking = rankArmies(world);
    expect(ranking.entries).toEqual([
      { army: big.slot, name: "Big", strength: 3 },
      { army: middle.slot, name: "Middle", strength: 1 },
    ]);
    expect(ranking.ranks.get(small)).toBe(3);
    expect(ranking.total).toBe(3);
  });
});
