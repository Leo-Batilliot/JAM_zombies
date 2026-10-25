import { describe, expect, test } from "vitest";
import { bestFocus, updateFocus, type Focus } from "../../src/net/spectate.js";
import { killMage } from "../../src/systems/mage.js";
import type { Army, World } from "../../src/world/world.js";
import { createBench } from "../support/bench.js";

const fill = (world: World, army: Army, count: number): void => {
  for (let index = 0; index < count; index++) {
    world.addUnit(army, "zombie", army.mage.x + 1, army.mage.y);
  }
};

describe("spectator focus", () => {
  test("follows the leader when nobody fights", () => {
    const { world, addArmy } = createBench();
    const small = addArmy(50, 50, "Small");
    const big = addArmy(300, 300, "Big");
    fill(world, small, 3);
    fill(world, big, 8);
    expect(bestFocus(world)).toBe(big);
  });

  test("follows the biggest battle when one is large enough", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      config.lobby.spectators.battleStrength = 6;
    });
    const leader = addArmy(300, 300, "Leader");
    fill(world, leader, 30);
    const red = addArmy(100, 100, "Red");
    const blue = addArmy(104, 100, "Blue");
    fill(world, red, 4);
    fill(world, blue, 4);
    step(config.network.tickRate);
    expect(red.battle).toBeDefined();
    expect([red, blue]).toContain(bestFocus(world));
  });

  test("ignores a battle below the configured size", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      config.lobby.spectators.battleStrength = 100;
    });
    const leader = addArmy(300, 300, "Leader");
    fill(world, leader, 30);
    const red = addArmy(100, 100, "Red");
    const blue = addArmy(104, 100, "Blue");
    fill(world, red, 4);
    fill(world, blue, 4);
    step(config.network.tickRate);
    expect(bestFocus(world)).toBe(leader);
  });

  test("keeps its target for the hold time, unless the mage dies", () => {
    const { world, config, addArmy } = createBench();
    const first = addArmy(50, 50, "First");
    fill(world, first, 5);
    const focus: Focus = { army: undefined, until: -Infinity };
    expect(updateFocus(world, focus)).toBe(true);
    expect(focus.army).toBe(first);
    const second = addArmy(300, 300, "Second");
    fill(world, second, 10);
    expect(updateFocus(world, focus)).toBe(false);
    world.time = config.lobby.spectators.holdSec;
    expect(updateFocus(world, focus)).toBe(true);
    expect(focus.army).toBe(second);
    killMage(world, second, undefined);
    expect(updateFocus(world, focus)).toBe(true);
    expect(focus.army).toBe(first);
  });

  test("reports no change while there is nobody to watch", () => {
    const { world } = createBench();
    const focus: Focus = { army: undefined, until: -Infinity };
    expect(updateFocus(world, focus)).toBe(false);
  });
});
