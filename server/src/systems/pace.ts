import type { Army, Unit, World } from "../world/world.js";
import { speedBonus } from "./equipment.js";
import { giftValue } from "./gifts.js";
import { armyStrength } from "./strength.js";
import { effectsOf } from "./tactics.js";

export const powerPace = (world: World, army: Army): number => {
  const { scale, factor, max } = world.config.gameplay.army.slowdown;
  return (
    1 - Math.min(max, factor * Math.log1p(armyStrength(world, army) / scale))
  );
};

export const unitSpeed = (world: World, unit: Unit): number =>
  world.registries.units.get(unit.type).speed * speedBonus(world, unit);

export const rallyBonus = (world: World, army: Army): number =>
  world.time < army.rally.until ? army.rally.multiplier : 1;

export const marchSpeed = (world: World, army: Army): number => {
  let speed =
    world.config.gameplay.mage.speed * (1 + giftValue(world, army, "speed"));
  for (const unit of army.units) {
    if (unit.group === undefined && !unit.returning) {
      speed = Math.min(speed, unitSpeed(world, unit));
    }
  }
  return (
    speed *
    powerPace(world, army) *
    effectsOf(world, army).speed *
    rallyBonus(world, army)
  );
};
