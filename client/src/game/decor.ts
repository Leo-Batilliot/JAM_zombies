import { seededRandom, type ClientConfig } from "@horde/shared";

export interface DecorItem {
  sprite: string;
  x: number;
  y: number;
}

export const placeDecor = (world: ClientConfig["world"]): DecorItem[] => {
  const random = seededRandom(world.decor.seed);
  const items: DecorItem[] = [];
  for (const { sprite, count } of world.decor.scattered) {
    for (let index = 0; index < count; index++) {
      items.push({
        sprite,
        x: random() * world.width,
        y: random() * world.height,
      });
    }
  }
  return items.sort((a, b) => a.y - b.y);
};
