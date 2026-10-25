import {
  generateCity,
  seededRandom,
  type City,
  type ClientConfig,
} from "@horde/shared";

export interface DecorItem {
  sprite: string;
  x: number;
  y: number;
}

export interface Light {
  x: number;
  y: number;
  radius: number;
}

export interface GroundPatch {
  ground: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CityLayout {
  city: City;
  grounds: GroundPatch[];
  tiles: DecorItem[];
  decor: DecorItem[];
  lights: Light[];
  ramparts: DecorItem[];
  outside: DecorItem[];
}

type Random = () => number;

const pick = <T>(list: T[], random: Random): T | undefined =>
  list[Math.floor(random() * list.length)];

const groundPatches = (config: ClientConfig, city: City): GroundPatch[] => {
  const { width, height, city: settings } = config.world;
  return [
    { ground: settings.streetGround, x: 0, y: 0, width, height },
    ...city.districts.map((district) => ({
      ground:
        settings.templates[district.template]?.ground ?? settings.streetGround,
      x: district.x,
      y: district.y,
      width: district.size,
      height: district.size,
    })),
  ];
};

const groundTiles = (
  config: ClientConfig,
  grounds: GroundPatch[],
  random: Random,
): DecorItem[] => {
  const look = config.client.city;
  const tile = look.tilePixels / config.client.pixelsPerMeter;
  const tiles: DecorItem[] = [];
  for (const patch of grounds) {
    const ground = look.grounds[patch.ground];
    if (ground === undefined || ground.variants.length === 0) {
      continue;
    }
    const columns = Math.floor(patch.width / tile);
    const rows = Math.floor(patch.height / tile);
    const count = Math.round(columns * rows * ground.variantRate);
    for (let index = 0; index < count; index++) {
      const sprite = pick(ground.variants, random);
      if (sprite !== undefined) {
        tiles.push({
          sprite,
          x: patch.x + Math.floor(random() * columns) * tile,
          y: patch.y + Math.floor(random() * rows) * tile,
        });
      }
    }
  }
  return tiles;
};

const compositions = (
  config: ClientConfig,
  city: City,
  random: Random,
): { decor: DecorItem[]; lights: Light[] } => {
  const settings = config.world.city;
  const decor: DecorItem[] = [];
  const lights: Light[] = [];
  for (const district of city.districts) {
    for (const placement of settings.templates[district.template]?.decor ??
      []) {
      const composition = settings.compositions[placement.composition];
      if (composition === undefined) {
        continue;
      }
      const x = district.x + placement.at[0] * district.size;
      const y = district.y + placement.at[1] * district.size;
      for (const item of composition.items) {
        decor.push({ sprite: item.sprite, x: x + item.x, y: y + item.y });
        if (item.light !== undefined) {
          lights.push({ x: x + item.x, y: y + item.y, radius: item.light });
        }
      }
      const scatter = composition.scatter;
      for (let index = 0; index < (scatter?.count ?? 0); index++) {
        const sprite = scatter && pick(scatter.sprites, random);
        const angle = random() * 2 * Math.PI;
        const distance = Math.sqrt(random()) * (scatter?.radius ?? 0);
        if (sprite !== undefined) {
          decor.push({
            sprite,
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
          });
        }
      }
    }
  }
  return { decor, lights };
};

const rampartPieces = (config: ClientConfig): DecorItem[] => {
  const { width, height } = config.world;
  const { border } = config.world.city;
  const { tower, towerSpacing, gate } = config.client.city.ramparts;
  if (border <= 0) {
    return [];
  }
  const pieces: DecorItem[] = [];
  const middle = border / 2;
  for (let x = 0; x <= width; x += towerSpacing) {
    pieces.push({ sprite: tower, x, y: middle });
    pieces.push({ sprite: tower, x, y: height - middle });
  }
  for (let y = towerSpacing; y < height; y += towerSpacing) {
    pieces.push({ sprite: tower, x: middle, y });
    pieces.push({ sprite: tower, x: width - middle, y });
  }
  pieces.push(
    { sprite: gate, x: width / 2, y: border },
    { sprite: gate, x: width / 2, y: height },
  );
  return pieces;
};

const outsideTrees = (config: ClientConfig, random: Random): DecorItem[] => {
  const { width, height } = config.world;
  const { depth, trees, treeSpacing } = config.client.city.outside;
  const items: DecorItem[] = [];
  for (let x = -depth; x <= width + depth; x += treeSpacing) {
    for (let y = -depth; y <= height + depth; y += treeSpacing) {
      const inside = x > 0 && x < width && y > 0 && y < height;
      const sprite = pick(trees, random);
      if (!inside && sprite !== undefined) {
        items.push({
          sprite,
          x: x + (random() - 0.5) * treeSpacing,
          y: y + (random() - 0.5) * treeSpacing,
        });
      }
    }
  }
  return items;
};

const byDepth = (a: DecorItem, b: DecorItem): number => a.y - b.y;

export const layoutCity = (config: ClientConfig): CityLayout => {
  const { width, height, city: settings } = config.world;
  const city = generateCity(settings, width, height, config.citySeed);
  const random = seededRandom(config.citySeed);
  const grounds = groundPatches(config, city);
  const { decor, lights } = compositions(config, city, random);
  return {
    city,
    grounds,
    tiles: groundTiles(config, grounds, random),
    decor: decor.sort(byDepth),
    lights,
    ramparts: rampartPieces(config).sort(byDepth),
    outside: outsideTrees(config, random).sort(byDepth),
  };
};
