import { isBody, type World } from "../world/world.js";
import { bodyRadius, isFixedNpc } from "./bodies.js";

export const blockBodies = (world: World): void => {
  for (const entity of world.entities.values()) {
    if (!isBody(entity) || isFixedNpc(world, entity)) {
      continue;
    }
    const free = world.freePoint(entity.x, entity.y, bodyRadius(world, entity));
    if (free.x !== entity.x || free.y !== entity.y) {
      world.setPosition(entity, free.x, free.y);
    }
  }
};
