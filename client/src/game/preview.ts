import type { Texture } from "pixi.js";
import { animationFrames, skinSprite } from "./sprites.js";

export const skinPreview = (
  textures: Partial<Record<string, Texture>>,
  id: string,
): HTMLCanvasElement | undefined => {
  const [texture] = animationFrames(textures, skinSprite(id), "walk");
  if (texture === undefined) {
    return undefined;
  }
  const { frame } = texture;
  const canvas = document.createElement("canvas");
  canvas.width = frame.width;
  canvas.height = frame.height;
  canvas
    .getContext("2d")
    ?.drawImage(
      texture.source.resource as CanvasImageSource,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      0,
      0,
      frame.width,
      frame.height,
    );
  return canvas;
};
