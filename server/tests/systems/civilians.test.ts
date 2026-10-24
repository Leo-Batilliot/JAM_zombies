import { describe, expect, test } from "vitest";
import { EntityKind } from "@horde/shared";
import { kill } from "../../src/systems/death.js";
import type { Npc, World } from "../../src/world/world.js";
import { createBench } from "../support/bench.js";
import { civilianPopulation } from "../support/population.js";

const civilians = (world: World): Npc[] =>
  [...world.entities.values()].filter(
    (entity): entity is Npc => entity.kind === EntityKind.Npc,
  );

describe("civilian population", () => {
  test("fills the population in groups at start", () => {
    const { world, step } = createBench((config) => {
      config.world.populations = [civilianPopulation({ count: 12 })];
    });
    step();
    expect(civilians(world)).toHaveLength(12);
    expect(world.npcGroups.size).toBe(4);
  });

  test("spawns new groups away from mages", () => {
    const { config, world, addArmy, step } = createBench((config) => {
      config.world.populations = [civilianPopulation({ safeDistance: 60 })];
      config.world.spawnAttempts = 50;
    });
    const { mage } = addArmy(200, 200);
    step();
    for (const group of world.npcGroups) {
      expect(Math.hypot(group.x - mage.x, group.y - mage.y)).toBeGreaterThan(
        config.world.populations[0]?.safeDistance ?? 0,
      );
    }
  });

  test("respawns killed civilians after the interval", () => {
    const { config, world, step } = createBench((config) => {
      config.world.populations = [
        civilianPopulation({ count: 3, respawnIntervalSec: 2 }),
      ];
    });
    step();
    for (const npc of civilians(world)) {
      kill(world, npc, undefined);
    }
    expect(civilians(world)).toHaveLength(0);
    step(config.network.tickRate);
    expect(civilians(world)).toHaveLength(0);
    step(config.network.tickRate * 2);
    expect(civilians(world)).toHaveLength(3);
  });
});

describe("civilian behavior", () => {
  test("flees from a nearby army", () => {
    const { config, world, addArmy, addCivilians, step } = createBench(
      (config) => {
        config.world.populations = [civilianPopulation({ count: 0 })];
      },
    );
    const { mage } = addArmy(100, 100);
    addCivilians(104, 100, 1);
    step(config.network.tickRate);
    const [npc] = civilians(world);
    expect(npc?.x).toBeGreaterThan(105);
    expect(mage.x).toBe(100);
  });

  test("wanders around its group when no army is near", () => {
    const { config, world, addCivilians, step } = createBench((config) => {
      config.world.populations = [civilianPopulation({ count: 0 })];
    });
    const group = addCivilians(200, 200, 3);
    step(config.network.tickRate * 20);
    expect(Math.hypot(group.x - 200, group.y - 200)).toBeGreaterThan(0);
    for (const npc of group.members) {
      expect(Math.hypot(npc.x - group.x, npc.y - group.y)).toBeLessThan(5);
    }
    expect(world.npcGroups.size).toBe(1);
  });
});
