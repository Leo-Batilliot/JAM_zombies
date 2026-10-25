import type { Army, World } from "../world/world.js";
import { setMageTarget } from "./movement.js";

export { chooseCard as orderCard } from "./evolution.js";
export { requestRespawn as orderRespawn } from "./mage.js";
export { castSpell as orderCast } from "./spells.js";
export { orderAttack } from "./targeting.js";

export const orderMove = (
  world: World,
  army: Army,
  x: number,
  y: number,
): void => {
  army.focusId = undefined;
  setMageTarget(world, army.mage, x, y);
};
