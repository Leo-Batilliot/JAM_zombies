import { isBody, type World } from "../world/world.js";
import { bodyRadius, isFixedNpc } from "./bodies.js";

export const blockBodies = (world: World): void => {
  for (const entity of world.entities.values()) {
    if (!isBody(entity) || isFixedNpc(world, entity)) {
      continue;
    }
    const free = world.obstacles.resolve(
      entity.x,
      entity.y,
      bodyRadius(world, entity),
    );
    if (free !== undefined) {
      world.setPosition(entity, free.x, free.y);
    }
  }
};
