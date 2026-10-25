import { Rectangle, Texture, type TextureSource } from "pixi.js";

const alphaThreshold = 128;
const sheetWidth = 1024;

export interface Outline {
  texture: Texture;
  border: number;
}

export const outlineMask = (
  alpha: (x: number, y: number) => number,
  width: number,
  height: number,
): Uint8Array => {
  const outWidth = width + 2;
  const mask = new Uint8Array(outWidth * (height + 2));
  const solid = (x: number, y: number): boolean =>
    x >= 0 &&
    y >= 0 &&
    x < width &&
    y < height &&
    alpha(x, y) >= alphaThreshold;
  for (let y = -1; y <= height; y++) {
    for (let x = -1; x <= width; x++) {
      if (solid(x, y)) {
        continue;
      }
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) {
        for (let dx = -1; dx <= 1 && !edge; dx++) {
          edge = solid(x + dx, y + dy);
        }
      }
      if (edge) {
        mask[(y + 1) * outWidth + x + 1] = 1;
      }
    }
  }
  return mask;
};

const sourcePixels = (source: TextureSource): ImageData | undefined => {
  const resource: unknown = source.resource;
  if (
    !(resource instanceof ImageBitmap) &&
    !(resource instanceof HTMLImageElement) &&
    !(resource instanceof HTMLCanvasElement)
  ) {
    return undefined;
  }
  const canvas = document.createElement("canvas");
  canvas.width = source.pixelWidth;
  canvas.height = source.pixelHeight;
  const context = canvas.getContext("2d");
  if (context === null) {
    return undefined;
  }
  context.drawImage(resource, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
};

export const buildOutlines = (
  textures: Partial<Record<string, Texture>>,
): Map<Texture, Outline> => {
  const outlines = new Map<Texture, Outline>();
  const list = Object.values(textures).filter(
    (texture): texture is Texture => texture !== undefined,
  );
  const first = list[0];
  const pixels = first === undefined ? undefined : sourcePixels(first.source);
  if (first === undefined || pixels === undefined) {
    return outlines;
  }
  const placed: { texture: Texture; x: number; y: number; mask: Uint8Array }[] =
    [];
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  for (const texture of list) {
    if (texture.source !== first.source) {
      continue;
    }
    const { x: frameX, y: frameY, width, height } = texture.frame;
    const mask = outlineMask(
      (x, y) =>
        pixels.data[((frameY + y) * pixels.width + frameX + x) * 4 + 3] ?? 0,
      width,
      height,
    );
    if (cursorX + width + 2 > sheetWidth) {
      cursorX = 0;
      cursorY += rowHeight;
      rowHeight = 0;
    }
    placed.push({ texture, x: cursorX, y: cursorY, mask });
    cursorX += width + 2;
    rowHeight = Math.max(rowHeight, height + 2);
  }
  const canvas = document.createElement("canvas");
  canvas.width = sheetWidth;
  canvas.height = Math.max(1, cursorY + rowHeight);
  const context = canvas.getContext("2d");
  if (context === null) {
    return outlines;
  }
  const image = context.createImageData(canvas.width, canvas.height);
  for (const { texture, x, y, mask } of placed) {
    const outWidth = texture.frame.width + 2;
    mask.forEach((value, index) => {
      if (value === 0) {
        return;
      }
      const offset =
        ((y + Math.floor(index / outWidth)) * canvas.width +
          x +
          (index % outWidth)) *
        4;
      image.data.set([255, 255, 255, 255], offset);
    });
  }
  context.putImageData(image, 0, 0);
  const sheet = Texture.from(canvas).source;
  sheet.scaleMode = first.source.scaleMode;
  for (const { texture, x, y } of placed) {
    outlines.set(texture, {
      texture: new Texture({
        source: sheet,
        frame: new Rectangle(
          x,
          y,
          texture.frame.width + 2,
          texture.frame.height + 2,
        ),
      }),
      border: 1,
    });
  }
  return outlines;
};
