import { DemoCommand } from "@horde/shared";
import type { Army, World } from "../world/world.js";
import { startEvent } from "./events.js";
import { killMage } from "./mage.js";

export const runDemo = (
  world: World,
  army: Army,
  command: DemoCommand,
): void => {
  if (!army.alive) {
    return;
  }
  const demo = world.config.gameplay.demo;
  const { mage } = army;
  switch (command) {
    case DemoCommand.Screamer:
      killMage(world, army, undefined, demo.killerName);
      break;
    case DemoCommand.Boss: {
      const angle = world.random() * 2 * Math.PI;
      startEvent(
        world,
        demo.event,
        world.clampX(mage.x + Math.cos(angle) * demo.eventDistance),
        world.clampY(mage.y + Math.sin(angle) * demo.eventDistance),
      );
      break;
    }
    case DemoCommand.Units: {
      const { raiseRadius } = world.config.gameplay.reanimation;
      for (let index = 0; index < demo.unitCount; index++) {
        const { x, y } = world.randomNear(mage.x, mage.y, raiseRadius);
        world.addUnit(army, demo.unit, x, y).raisedAt = world.time;
      }
      break;
    }
  }
};
