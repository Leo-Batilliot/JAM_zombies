import type { Army, World } from "../world/world.js";

export const addStartingUnits = (world: World, army: Army): void => {
  const { startingUnits, spawnRadius } = world.config.gameplay.army;
  const total = startingUnits.reduce((sum, entry) => sum + entry.count, 0);
  let index = 0;
  for (const { unit, count } of startingUnits) {
    for (let copy = 0; copy < count; copy++) {
      const angle = (index++ / total) * 2 * Math.PI;
      world.addUnit(
        army,
        unit,
        army.mage.x + Math.cos(angle) * spawnRadius,
        army.mage.y + Math.sin(angle) * spawnRadius,
      );
    }
  }
};

export const spawnArmy = (world: World, name: string, skin?: string): Army => {
  const { x, y } = world.randomPoint();
  const army = world.addArmy(name, x, y, skin);
  addStartingUnits(world, army);
  return army;
};
