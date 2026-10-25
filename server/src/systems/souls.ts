import type { Config } from "@horde/shared";
import type { Army, World } from "../world/world.js";
import { offerCards } from "./evolution.js";
import { growthFactor } from "../lobby/handicap.js";
import { giftValue } from "./gifts.js";

type SoulRules = Config["gameplay"]["souls"];

export const soulsToReach = (level: number, rules: SoulRules): number => {
  let total = 0;
  for (let reached = 1; reached < level; reached++) {
    total += rules.levelBase * rules.levelGrowth ** (reached - 1);
  }
  return total;
};

export const levelForSouls = (souls: number, rules: SoulRules): number => {
  let level = 1;
  while (soulsToReach(level + 1, rules) <= souls) {
    level++;
  }
  return level;
};

export const maxHp = (world: World, army: Army): number => {
  const { baseHp, hpPerLevel } = world.config.gameplay.mage;
  return baseHp + hpPerLevel * (army.level - 1) + giftValue(world, army, "hp");
};

export const grantSouls = (world: World, army: Army, souls: number): void => {
  const previousMax = maxHp(world, army);
  const previousLevel = army.level;
  army.souls += souls * growthFactor(army);
  army.level = levelForSouls(army.souls, world.config.gameplay.souls);
  army.mage.hp += maxHp(world, army) - previousMax;
  army.pendingLevels += army.level - previousLevel;
  offerCards(world, army);
};
