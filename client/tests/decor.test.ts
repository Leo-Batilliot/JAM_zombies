import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  configSchema,
  toClientConfig,
  type ClientConfig,
  type ConfigFile,
} from "@horde/shared";
import { layoutCity } from "../src/game/decor.js";

const configDir = join(import.meta.dirname, "../../shared/config");
const atlasDir = join(import.meta.dirname, "../public/atlas");

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(path, "utf8"));

const loadClientConfig = (seed: number): ClientConfig => {
  const files = Object.keys(configSchema.shape) as ConfigFile[];
  const config = configSchema.parse(
    Object.fromEntries(
      files.map((file) => [file, readJson(join(configDir, `${file}.json`))]),
    ),
  );
  return toClientConfig(config, seed);
};

const atlasFrames = (): Set<string> => {
  const manifest = readJson(join(atlasDir, "manifest.json")) as {
    sheets: string[];
  };
  const names = new Set<string>();
  for (const sheet of manifest.sheets) {
    const data = readJson(join(atlasDir, sheet)) as {
      frames: Record<string, unknown>;
    };
    Object.keys(data.frames).forEach((name) => names.add(name));
  }
  return names;
};

const config = loadClientConfig(1234);

describe("layoutCity", () => {
  test("gives the same layout for the same seed", () => {
    expect(layoutCity(config)).toEqual(layoutCity(config));
  });

  test("changes with the city seed", () => {
    expect(layoutCity(loadClientConfig(99)).city).not.toEqual(
      layoutCity(config).city,
    );
  });

  test("covers the streets, then every district with its ground", () => {
    const { grounds, city } = layoutCity(config);
    expect(grounds[0]).toMatchObject({
      ground: config.world.city.streetGround,
      width: config.world.width,
    });
    expect(grounds).toHaveLength(city.districts.length + 1);
  });

  test("sorts decor from back to front", () => {
    const ys = layoutCity(config).decor.map((item) => item.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
  });

  test("lights every lamp of the compositions", () => {
    expect(layoutCity(config).lights.length).toBeGreaterThan(0);
  });

  test("keeps the outside trees out of the map", () => {
    const { width, height } = config.world;
    const { treeSpacing } = config.client.city.outside;
    for (const tree of layoutCity(config).outside) {
      const inside =
        tree.x > treeSpacing &&
        tree.x < width - treeSpacing &&
        tree.y > treeSpacing &&
        tree.y < height - treeSpacing;
      expect(inside).toBe(false);
    }
  });
});

describe("city look", () => {
  const look = config.client.city;
  const templates = Object.values(config.world.city.templates);

  test("has a look for every ground and obstacle of the city", () => {
    const grounds = [
      config.world.city.streetGround,
      ...templates.map((template) => template.ground),
    ];
    for (const ground of grounds) {
      expect(look.grounds).toHaveProperty(ground);
    }
    const kinds = new Set(layoutCity(config).city.obstacles.map((o) => o.kind));
    for (const template of templates) {
      template.obstacles.forEach((shape) => kinds.add(shape.kind));
    }
    for (const kind of kinds) {
      expect(look.obstacles).toHaveProperty(kind);
    }
  });

  test("only uses sprites that are in the atlas", () => {
    const frames = atlasFrames();
    const sprites = [
      ...Object.values(look.grounds).flatMap((g) => [g.tile, ...g.variants]),
      ...Object.values(look.obstacles).flatMap((style) =>
        "sprite" in style ? [style.sprite] : [style.roof, style.wall],
      ),
      look.ramparts.tower,
      look.ramparts.gate,
      look.outside.ground,
      ...look.outside.trees,
      ...Object.values(config.world.city.compositions).flatMap(
        (composition) => [
          ...composition.items.map((item) => item.sprite),
          ...(composition.scatter?.sprites ?? []),
        ],
      ),
    ];
    for (const sprite of sprites) {
      expect(frames, sprite).toContain(sprite);
    }
  });
});

describe("content sprites", () => {
  const frames = atlasFrames();
  const drawable = (name: string): boolean => {
    const sprite = config.client.spriteAliases[name]?.sprite ?? name;
    return [`${sprite}-walk-s-0`, `${sprite}-walk-0`, sprite].some((frame) =>
      frames.has(frame),
    );
  };

  test("every unit, npc, item, point and place can be drawn", () => {
    const { content } = config;
    const names = [
      ...content.units.map((unit) => `unit-${unit.id}`),
      ...content.npcs.map((npc) => `npc-${npc}`),
      ...content.items.map((item) => `item-${item.id}`),
      ...content.pointsOfInterest.map((point) => `poi-${point}`),
      ...content.places.map((place) => `place-${place}`),
    ];
    expect(names.filter((name) => !drawable(name))).toEqual([]);
  });
});
