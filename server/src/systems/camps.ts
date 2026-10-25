import { distanceToMages, farPoint } from "../world/spawn.js";
import type { Camp, World } from "../world/world.js";
import { spawnPoint } from "./points.js";

const spawnCamp = (world: World): Camp => {
  const { safeDistance, lifetimeSec, spread, defenders, districts } =
    world.config.world.camps;
  const { x, y } = farPoint(
    world,
    (px, py) => distanceToMages(world, px, py),
    safeDistance,
    districts,
  );
  const camp = world.addCamp(
    x,
    y,
    lifetimeSec.min + world.random() * (lifetimeSec.max - lifetimeSec.min),
  );
  for (const { npc, count } of defenders) {
    for (let index = 0; index < count; index++) {
      const place = world.randomNear(x, y, spread);
      world.addCampNpc(camp, npc, place.x, place.y);
    }
  }
  return camp;
};

const isQuiet = (camp: Camp): boolean =>
  [...camp.defenders].every((npc) => npc.targetId === undefined);

export const maintainCamps = (world: World): void => {
  for (const camp of world.camps) {
    if (camp.defenders.size === 0) {
      spawnPoint(world, world.config.world.camps.chest, camp.x, camp.y);
      world.removeEntity(camp);
    } else if (world.time >= camp.expiresAt && isQuiet(camp)) {
      for (const npc of camp.defenders) {
        world.removeEntity(npc);
      }
      world.removeEntity(camp);
    }
  }
  while (world.camps.size < world.config.world.camps.count) {
    spawnCamp(world);
  }
};
