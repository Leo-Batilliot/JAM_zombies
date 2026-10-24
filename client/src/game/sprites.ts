import {
  EntityKind,
  type ClientConfig,
  type SnapshotEntity,
} from "@horde/shared";

export const animationFrames = <T>(
  textures: Partial<Record<string, T>>,
  name: string,
  animation: string,
): T[] => {
  const frames: T[] = [];
  for (let index = 0; ; index++) {
    const texture = textures[`${name}-${animation}-${String(index)}`];
    if (texture === undefined) {
      break;
    }
    frames.push(texture);
  }
  const still = textures[name];
  if (frames.length === 0 && still !== undefined) {
    frames.push(still);
  }
  return frames;
};

export const frameAt = <T>(
  frames: T[],
  time: number,
  frameMs: number,
): T | undefined =>
  frames[Math.floor(Math.max(time, 0) / frameMs) % frames.length];

export const spriteName = (
  entity: SnapshotEntity,
  content: ClientConfig["content"],
): string => {
  switch (entity.kind) {
    case EntityKind.Mage:
      return "mage";
    case EntityKind.Unit:
      return `unit-${content.units[entity.type] ?? ""}`;
    case EntityKind.Npc:
      return `npc-${content.npcs[entity.type] ?? ""}`;
    case EntityKind.Corpse:
      return "corpse";
    case EntityKind.PointOfInterest:
      return `poi-${content.pointsOfInterest[entity.type] ?? ""}`;
  }
};

export const parseColor = (color: string): number =>
  Number.parseInt(color.slice(1), 16);

export const armyColor = (colors: string[], army: number): number =>
  parseColor(colors[(army - 1) % colors.length] ?? "#ffffff");
