import { Assets, type Spritesheet } from "pixi.js";

const atlasUrl = "atlas/atlas.json";

export const loadAtlas = (): Promise<Spritesheet> => Assets.load(atlasUrl);
