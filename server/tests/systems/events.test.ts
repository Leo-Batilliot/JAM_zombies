import { describe, expect, test } from "vitest";
import { EntityKind, type Config } from "@horde/shared";
import { damage } from "../../src/systems/death.js";
import { runEvents, startEvent } from "../../src/systems/events.js";
import { createBench } from "../support/bench.js";

const event = (config: Config) => {
  const pumpkin = config.events.events["pumpkin"];
  if (pumpkin === undefined) {
    throw new Error("Missing pumpkin event");
  }
  return pumpkin;
};

const npcType = (config: Config, id: string) => {
  const npc = config.units.npcs[id];
  if (npc?.attack === undefined) {
    throw new Error(`Missing hostile npc ${id}`);
  }
  return { ...npc, attack: npc.attack };
};

describe("evil pumpkin event", () => {
  test("the boss appears after the first delay", () => {
    const { world, step } = createBench((config) => {
      event(config).firstDelaySec = 1;
    });
    step(10);
    expect(world.events.get("pumpkin")?.boss).toBeUndefined();
    step(15);
    const boss = world.events.get("pumpkin")?.boss;
    expect(boss?.type).toBe("evil-pumpkin");
    expect(world.entities.get(boss?.id ?? 0)?.kind).toBe(EntityKind.Npc);
  });

  test("the boss summons lanterns up to the maximum", () => {
    const { world, step } = createBench((config) => {
      Object.assign(event(config), {
        firstDelaySec: 0,
        summonIntervalSec: 0.5,
        summonCount: 2,
        maxMinions: 5,
      });
    });
    step();
    expect(world.events.get("pumpkin")?.minions.size).toBe(2);
    step(40);
    const minions = [...(world.events.get("pumpkin")?.minions ?? [])];
    expect(minions).toHaveLength(5);
    expect(minions.every((npc) => npc.type === "jack-o-lantern")).toBe(true);
  });

  test("the boss leaves without reward at the end of its lifetime", () => {
    const { world, config, step } = createBench((config) => {
      Object.assign(event(config), { firstDelaySec: 0, lifetimeSec: 1 });
    });
    step();
    const state = world.events.get("pumpkin");
    const bossId = state?.boss?.id ?? 0;
    const minions = [...(state?.minions ?? [])];
    step(20);
    expect(state?.boss).toBeUndefined();
    expect(world.entities.has(bossId)).toBe(false);
    expect(minions.some((npc) => world.entities.has(npc.id))).toBe(false);
    expect(state?.result?.defeated).toBe(false);
    expect(state?.nextAt).toBeCloseTo(
      world.time + event(config).intervalSec,
      0,
    );
  });

  test("souls are shared by damage relative to army strength", () => {
    const { world, config, addArmy } = createBench();
    const small = addArmy(50, 50, "Small");
    const big = addArmy(80, 50, "Big");
    for (let index = 0; index < 5; index++) {
      world.addUnit(small, "zombie", 50, 52);
      world.addUnit(big, "zombie", 80, 52);
      world.addUnit(big, "zombie", 80, 53);
    }
    const state = startEvent(world, "pumpkin", 200, 200);
    const boss = state.boss;
    if (boss === undefined) {
      throw new Error("Expected a boss");
    }
    boss.hp = 25;
    damage(world, boss, 10, small);
    damage(world, boss, 10, big);
    damage(world, boss, 5, small);
    const { rewardSouls } = event(config);
    expect(state.boss).toBeUndefined();
    expect(state.result?.defeated).toBe(true);
    expect(state.result?.rewards.get(small)).toBeCloseTo(rewardSouls * 0.75);
    expect(state.result?.rewards.get(big)).toBeCloseTo(rewardSouls * 0.25);
    expect(big.souls).toBeCloseTo(rewardSouls * 0.25);
  });

  test("the lanterns disappear with the boss", () => {
    const { world, addArmy } = createBench();
    const state = startEvent(world, "pumpkin", 200, 200);
    runEvents(world);
    const minions = [...state.minions];
    expect(minions.length).toBeGreaterThan(0);
    const boss = state.boss;
    if (boss === undefined) {
      throw new Error("Expected a boss");
    }
    damage(world, boss, 1e9, addArmy(10, 10));
    expect(minions.some((npc) => world.entities.has(npc.id))).toBe(false);
  });

  test("a new event replaces the current boss", () => {
    const { world } = createBench();
    const first = startEvent(world, "pumpkin", 100, 100).boss;
    const second = startEvent(world, "pumpkin", 300, 300).boss;
    expect(world.entities.has(first?.id ?? 0)).toBe(false);
    expect(second?.x).toBe(300);
  });
});

describe("hostile npcs", () => {
  test("a lantern kills a unit, which stays with its army", () => {
    const { world, addArmy, step } = createBench((config) => {
      const lantern = npcType(config, "jack-o-lantern");
      config.units.npcs["jack-o-lantern"] = {
        ...lantern,
        hp: 1e6,
        attack: { ...lantern.attack, damage: 1000 },
      };
    });
    const army = addArmy(100, 100);
    const unit = world.addUnit(army, "zombie", 104, 100);
    world.addEventNpc("jack-o-lantern", 108, 100, "pumpkin");
    for (let tick = 0; tick < 100 && world.entities.has(unit.id); tick++) {
      step();
    }
    expect(world.entities.has(unit.id)).toBe(false);
    const [corpse] = army.corpses;
    expect(corpse?.owner).toBe(army);
    expect(corpse?.killer).toBeUndefined();
    expect(army.souls).toBe(0);
  });

  test("the boss kills a lone mage under its own name", () => {
    const { world, config, addArmy, step } = createBench((config) => {
      const boss = npcType(config, "evil-pumpkin");
      config.units.npcs["evil-pumpkin"] = {
        ...boss,
        attack: { ...boss.attack, damage: 1000 },
      };
      config.gameplay.soulLink.maxLossPerSec = 100;
    });
    const army = addArmy(100, 100);
    startEvent(world, "pumpkin", 103, 100);
    step(10);
    expect(army.alive).toBe(false);
    expect(army.killerName).toBe(config.units.npcs["evil-pumpkin"]?.name);
  });

  test("units push around the boss without moving it", () => {
    const { world, addArmy, step } = createBench();
    const army = addArmy(100, 100);
    for (let index = 0; index < 10; index++) {
      world.addUnit(army, "zombie", 100.5, 100);
    }
    const boss = startEvent(world, "pumpkin", 100, 100).boss;
    step(5);
    expect(boss?.x).toBe(100);
    expect(boss?.y).toBe(100);
    for (const unit of army.units) {
      expect(Math.hypot(unit.x - 100, unit.y - 100)).toBeGreaterThan(2);
    }
  });
});
