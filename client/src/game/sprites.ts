import {
  EntityKind,
  flagLevel,
  type Layer,
  type ClientConfig,
  type SnapshotEntity,
} from "@horde/shared";

export type Direction = "n" | "s" | "e" | "w";

const sequence = <T>(
  textures: Partial<Record<string, T>>,
  prefix: string,
): T[] => {
  const frames: T[] = [];
  for (let index = 0; ; index++) {
    const texture = textures[`${prefix}${String(index)}`];
    if (texture === undefined) {
      return frames;
    }
    frames.push(texture);
  }
};

export const directionalFrames = <T>(
  textures: Partial<Record<string, T>>,
  name: string,
  animation: string,
  direction: Direction,
): T[] => {
  const exact = sequence(textures, `${name}-${animation}-${direction}-`);
  return exact.length > 0
    ? exact
    : sequence(textures, `${name}-${animation}-s-`);
};

export const animationFrames = <T>(
  textures: Partial<Record<string, T>>,
  name: string,
  animation: string,
  direction: Direction = "s",
): T[] => {
  const directional = directionalFrames(textures, name, animation, direction);
  if (directional.length > 0) {
    return directional;
  }
  const frames = sequence(textures, `${name}-${animation}-`);
  const still = textures[name];
  if (frames.length === 0 && still !== undefined) {
    frames.push(still);
  }
  return frames;
};

export const hasDirections = (
  textures: Partial<Record<string, unknown>>,
  name: string,
): boolean => textures[`${name}-walk-s-0`] !== undefined;

export const directionOf = (
  dx: number,
  dy: number,
  current: Direction,
  epsilon: number,
): Direction => {
  if (Math.abs(dx) <= epsilon && Math.abs(dy) <= epsilon) {
    return current;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "e" : "w";
  }
  return dy > 0 ? "s" : "n";
};

export const frameAt = <T>(
  frames: T[],
  time: number,
  frameMs: number,
): T | undefined =>
  frames[Math.floor(Math.max(time, 0) / frameMs) % frames.length];

export const skinSprite = (id: string): string => `mage-${id}`;

export const layerOf = (
  entity: SnapshotEntity,
  content: ClientConfig["content"],
): Layer => {
  const typeId =
    entity.kind === EntityKind.Unit
      ? content.units[entity.type]?.id
      : entity.kind === EntityKind.Npc
        ? content.npcs[entity.type]
        : undefined;
  return (
    (typeId === undefined ? undefined : content.layers[typeId]) ?? "ground"
  );
};

export const spriteName = (
  entity: SnapshotEntity,
  content: ClientConfig["content"],
): string => {
  switch (entity.kind) {
    case EntityKind.Mage:
      return skinSprite(
        (content.skins[entity.type] ?? content.skins[0])?.id ?? "",
      );
    case EntityKind.Unit:
      return `unit-${content.units[entity.type]?.id ?? ""}`;
    case EntityKind.Npc:
      return `npc-${content.npcs[entity.type] ?? ""}`;
    case EntityKind.Corpse:
      return "corpse";
    case EntityKind.PointOfInterest:
      return `poi-${content.pointsOfInterest[entity.type] ?? ""}`;
    case EntityKind.Cross:
      return "cross";
    case EntityKind.Projectile:
      return `projectile-${content.projectiles[entity.type] ?? ""}`;
    case EntityKind.Mist:
      return `mist-${content.mists[entity.type]?.id ?? ""}`;
    case EntityKind.Camp:
      return entity.type === 0
        ? "camp"
        : `place-${content.places[entity.type - 1] ?? ""}`;
    case EntityKind.Bombing:
      return "bombing";
  }
};

export const gearName = (
  entity: SnapshotEntity,
  content: ClientConfig["content"],
): string | undefined => {
  const slot = flagLevel(entity.flags);
  if (entity.kind !== EntityKind.Unit || slot === 0) {
    return undefined;
  }
  const category = content.units[entity.type]?.equipment;
  const item = content.items.filter((entry) => entry.category === category)[
    slot - 1
  ];
  return item === undefined ? undefined : `item-${item.id}`;
};

export const parseHex = (color: string): number =>
  Number.parseInt(color.slice(1), 16);

export const armyHex = (colors: string[], army: number): string =>
  colors[(army - 1) % colors.length] ?? "#ffffff";

export const armyColor = (colors: string[], army: number): number =>
  parseHex(armyHex(colors, army));
