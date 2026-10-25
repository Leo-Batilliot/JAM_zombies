import type { Config } from "./config/schema.js";
import { seededRandom } from "./random.js";

type CitySettings = Config["world"]["city"];

export interface District {
  template: string;
  column: number;
  row: number;
  x: number;
  y: number;
  size: number;
}

export interface Obstacle {
  kind: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

export interface City {
  districts: District[];
  obstacles: Obstacle[];
}

const pickTemplates = (
  settings: CitySettings,
  count: number,
  random: () => number,
): string[] => {
  const used = new Map<string, number>();
  const picked: string[] = [];
  for (const [id, template] of Object.entries(settings.templates)) {
    for (
      let index = 0;
      index < template.min && picked.length < count;
      index++
    ) {
      picked.push(id);
      used.set(id, (used.get(id) ?? 0) + 1);
    }
  }
  while (picked.length < count) {
    const open = Object.entries(settings.templates).filter(
      ([id, template]) =>
        template.weight > 0 && (used.get(id) ?? 0) < template.max,
    );
    const total = open.reduce((sum, [, template]) => sum + template.weight, 0);
    if (total <= 0) {
      break;
    }
    let roll = random() * total;
    const choice =
      open.find(([, template]) => (roll -= template.weight) < 0) ?? open.at(-1);
    if (choice === undefined) {
      break;
    }
    picked.push(choice[0]);
    used.set(choice[0], (used.get(choice[0]) ?? 0) + 1);
  }
  for (let index = picked.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [picked[index], picked[other]] = [
      picked[other] as string,
      picked[index] as string,
    ];
  }
  return picked;
};

export const districtSize = (
  settings: CitySettings,
  width: number,
  height: number,
): number =>
  Math.min(
    (width - 2 * settings.border - (settings.columns - 1) * settings.street) /
      settings.columns,
    (height - 2 * settings.border - (settings.rows - 1) * settings.street) /
      settings.rows,
  );

const ramparts = (
  settings: CitySettings,
  width: number,
  height: number,
): Obstacle[] => {
  const { border } = settings;
  if (border <= 0) {
    return [];
  }
  const wall = (x: number, y: number, w: number, h: number): Obstacle => ({
    kind: "rampart",
    x,
    y,
    width: w,
    height: h,
    radius: 0,
  });
  return [
    wall(0, 0, width, border),
    wall(0, height - border, width, border),
    wall(0, 0, border, height),
    wall(width - border, 0, border, height),
  ];
};

export const generateCity = (
  settings: CitySettings,
  width: number,
  height: number,
  seed: number,
): City => {
  const random = seededRandom(seed);
  const size = districtSize(settings, width, height);
  const templates = pickTemplates(
    settings,
    settings.columns * settings.rows,
    random,
  );
  const districts: District[] = [];
  const obstacles: Obstacle[] = ramparts(settings, width, height);
  templates.forEach((template, index) => {
    const column = index % settings.columns;
    const row = Math.floor(index / settings.columns);
    const district = {
      template,
      column,
      row,
      x: settings.border + column * (size + settings.street),
      y: settings.border + row * (size + settings.street),
      size,
    };
    districts.push(district);
    for (const shape of settings.templates[template]?.obstacles ?? []) {
      if ("rect" in shape) {
        const [x, y, w, h] = shape.rect;
        obstacles.push({
          kind: shape.kind,
          x: district.x + x * size,
          y: district.y + y * size,
          width: w * size,
          height: h * size,
          radius: 0,
        });
      } else {
        const [x, y, r] = shape.circle;
        obstacles.push({
          kind: shape.kind,
          x: district.x + x * size,
          y: district.y + y * size,
          width: 0,
          height: 0,
          radius: r * size,
        });
      }
    }
  });
  return { districts, obstacles };
};

export const pushOut = (
  obstacle: Obstacle,
  x: number,
  y: number,
  radius: number,
): { x: number; y: number } | undefined => {
  if (obstacle.radius > 0) {
    const dx = x - obstacle.x;
    const dy = y - obstacle.y;
    const reach = obstacle.radius + radius;
    const gap = Math.hypot(dx, dy);
    if (gap >= reach) {
      return undefined;
    }
    const length = gap || 1;
    return {
      x: obstacle.x + ((gap === 0 ? 1 : dx) / length) * reach,
      y: obstacle.y + ((gap === 0 ? 0 : dy) / length) * reach,
    };
  }
  const right = obstacle.x + obstacle.width;
  const bottom = obstacle.y + obstacle.height;
  const nearX = Math.min(Math.max(x, obstacle.x), right);
  const nearY = Math.min(Math.max(y, obstacle.y), bottom);
  const dx = x - nearX;
  const dy = y - nearY;
  const gap = Math.hypot(dx, dy);
  if (gap > 0) {
    return gap >= radius
      ? undefined
      : { x: nearX + (dx / gap) * radius, y: nearY + (dy / gap) * radius };
  }
  const exits = [
    { x: obstacle.x - radius, y, depth: x - obstacle.x },
    { x: right + radius, y, depth: right - x },
    { x, y: obstacle.y - radius, depth: y - obstacle.y },
    { x, y: bottom + radius, depth: bottom - y },
  ];
  const exit = exits.reduce((best, next) =>
    next.depth < best.depth ? next : best,
  );
  return { x: exit.x, y: exit.y };
};

export const blocks = (
  obstacle: Obstacle,
  x: number,
  y: number,
  radius: number,
): boolean => pushOut(obstacle, x, y, radius) !== undefined;
