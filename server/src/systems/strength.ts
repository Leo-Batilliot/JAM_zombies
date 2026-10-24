import type { Army, World } from "../world/world.js";

export const armyStrength = (world: World, army: Army): number => {
  let strength = 0;
  for (const unit of army.units) {
    strength += world.registries.units.get(unit.type).strength;
  }
  return strength;
};
