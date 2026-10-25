import type { Army, World } from "../world/world.js";
import { setMageTarget } from "./movement.js";

export { evolve as orderEvolve } from "./evolution.js";
export { orderRetreat } from "./retreat.js";
export { orderAttack } from "./targeting.js";

export const orderMove = (
  world: World,
  army: Army,
  x: number,
  y: number,
): void => {
  army.focusId = undefined;
  army.retreat = undefined;
  setMageTarget(world, army.mage, x, y);
};
