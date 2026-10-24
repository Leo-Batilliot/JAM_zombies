import { describe, expect, test } from "vitest";
import { DemoCommand } from "@horde/shared";
import { runDemo } from "../../src/systems/demo.js";
import { createBench } from "../support/bench.js";

describe("demo commands", () => {
  test("the screamer command kills the mage", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    runDemo(world, army, DemoCommand.Screamer);
    expect(army.alive).toBe(false);
    expect(army.killerName).toBe(config.gameplay.demo.killerName);
    expect(army.deaths).toBe(1);
  });

  test("the boss command brings the pumpkin next to the mage", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    runDemo(world, army, DemoCommand.Boss);
    const boss = world.events.get(config.gameplay.demo.event)?.boss;
    expect(boss).toBeDefined();
    expect(Math.hypot((boss?.x ?? 0) - 100, (boss?.y ?? 0) - 100)).toBeCloseTo(
      config.gameplay.demo.eventDistance,
    );
  });

  test("the units command raises units around the mage", () => {
    const { world, config, addArmy } = createBench();
    const army = addArmy(100, 100);
    runDemo(world, army, DemoCommand.Units);
    expect(army.units.size).toBe(config.gameplay.demo.unitCount);
  });

  test("a dead mage cannot use the commands", () => {
    const { world, addArmy } = createBench();
    const army = addArmy(100, 100);
    runDemo(world, army, DemoCommand.Screamer);
    runDemo(world, army, DemoCommand.Units);
    expect(army.units.size).toBe(0);
    expect(army.deaths).toBe(1);
  });
});
