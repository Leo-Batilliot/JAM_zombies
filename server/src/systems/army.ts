import {
  distanceToHostiles,
  distanceToMages,
  farPoint,
} from "../world/spawn.js";
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
  addStarterCivilians(world, army);
};

const addStarterCivilians = (world: World, army: Army): void => {
  const { npc, count, distance } = world.config.gameplay.army.starterCivilians;
  const population = world.config.world.populations.findIndex(
    (entry) => entry.npc === npc,
  );
  const settings = world.config.world.populations[population];
  if (settings === undefined || count === 0) {
    return;
  }
  const angle = world.random() * 2 * Math.PI;
  const spot = world.freePoint(
    army.mage.x + Math.cos(angle) * distance,
    army.mage.y + Math.sin(angle) * distance,
    world.config.world.city.clearance,
  );
  const group = world.addNpcGroup(population, spot.x, spot.y);
  for (let index = 0; index < count; index++) {
    const offset = world.randomNear(0, 0, settings.groupSpread);
    world.addNpc(group, npc, offset.x, offset.y);
  }
};

export const spawnArmy = (world: World, name: string, skin?: string): Army => {
  const { x, y } = farPoint(
    world,
    (px, py) =>
      Math.min(
        distanceToMages(world, px, py),
        distanceToHostiles(world, px, py),
      ),
    world.config.gameplay.respawn.safeDistance,
  );
  const army = world.addArmy(name, x, y, skin);
  addStartingUnits(world, army);
  return army;
};
