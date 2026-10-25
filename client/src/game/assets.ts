import { Assets, type Spritesheet } from "pixi.js";

const atlasFolder = "atlas/";
const atlasUrl = `${atlasFolder}atlas.json`;

export const atlasImage = (atlas: Spritesheet): string =>
  `${atlasFolder}${atlas.data.meta.image ?? ""}`;

export const loadAtlas = (): Promise<Spritesheet> => Assets.load(atlasUrl);
