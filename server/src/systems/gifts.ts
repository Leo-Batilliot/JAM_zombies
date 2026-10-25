import type { Config } from "@horde/shared";
import { EntityKind } from "@horde/shared";
import type { Army, World } from "../world/world.js";

type GiftEffect = Config["gameplay"]["gifts"][string]["effect"];

export const giftValue = (
  world: World,
  army: Army,
  effect: GiftEffect,
): number => {
  let value = 0;
  for (const [id, stacks] of army.gifts) {
    const gift = world.registries.gifts.get(id);
    if (gift.effect === effect) {
      value += gift.value * stacks;
    }
  }
  return value;
};

const healRadius = (world: World, army: Army): number => {
  let radius = 0;
  for (const id of army.gifts.keys()) {
    const gift = world.registries.gifts.get(id);
    if (gift.effect === "heal") {
      radius = Math.max(radius, gift.radius ?? 0);
    }
  }
  return radius;
};

export const healTroops = (world: World, dt: number): void => {
  for (const army of world.armies.values()) {
    const amount = giftValue(world, army, "heal") * dt;
    if (!army.alive || amount <= 0) {
      continue;
    }
    const radius = healRadius(world, army);
    for (const id of world.grid.queryRadius(army.mage.x, army.mage.y, radius)) {
      const unit = world.entities.get(id);
      if (unit?.kind === EntityKind.Unit && unit.army === army) {
        unit.hp = Math.min(
          world.unitMaxHp(unit.type, unit.item),
          unit.hp + amount,
        );
      }
    }
  }
};
