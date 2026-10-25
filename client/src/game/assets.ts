import { Assets, type Spritesheet, type Texture } from "pixi.js";

const atlasFolder = "atlas/";

export interface Atlas {
  sheets: Spritesheet[];
  textures: Partial<Record<string, Texture>>;
}

export interface AtlasFrame {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sheetWidth: number;
  sheetHeight: number;
}

const isManifest = (value: unknown): value is { sheets: string[] } =>
  typeof value === "object" &&
  value !== null &&
  "sheets" in value &&
  Array.isArray(value.sheets) &&
  value.sheets.every((sheet) => typeof sheet === "string");

export const loadAtlas = async (): Promise<Atlas> => {
  const response = await fetch(`${atlasFolder}manifest.json`);
  const manifest: unknown = await response.json();
  if (!isManifest(manifest)) {
    throw new Error("Invalid atlas manifest");
  }
  const sheets = await Promise.all(
    manifest.sheets.map((sheet) =>
      Assets.load<Spritesheet>(`${atlasFolder}${sheet}`),
    ),
  );
  const textures: Partial<Record<string, Texture>> = {};
  for (const sheet of sheets) {
    Object.assign(textures, sheet.textures);
  }
  return { sheets, textures };
};

export const atlasFrame = (
  atlas: Atlas,
  name: string,
): AtlasFrame | undefined => {
  for (const sheet of atlas.sheets) {
    const frame = sheet.data.frames[name]?.frame;
    const size = sheet.data.meta.size;
    if (frame !== undefined && size !== undefined) {
      return {
        url: `${atlasFolder}${sheet.data.meta.image ?? ""}`,
        x: frame.x,
        y: frame.y,
        width: frame.w,
        height: frame.h,
        sheetWidth: size.w,
        sheetHeight: size.h,
      };
    }
  }
  return undefined;
};
