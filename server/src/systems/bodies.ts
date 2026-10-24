import { EntityKind } from "@horde/shared";
import type { Body, Entity, World } from "../world/world.js";

export const bodyRadius = (world: World, body: Body): number => {
  switch (body.kind) {
    case EntityKind.Mage:
      return world.config.gameplay.mage.radius;
    case EntityKind.Unit:
      return world.registries.units.get(body.type).radius;
    case EntityKind.Npc:
      return world.registries.npcs.get(body.type).radius;
  }
};

export const largestRadius = (world: World): number =>
  Math.max(
    world.config.gameplay.mage.radius,
    ...world.registries.units.entries().map(([, unit]) => unit.radius),
    ...world.registries.npcs.entries().map(([, npc]) => npc.radius),
  );

export const distance = (a: Entity, b: Entity): number =>
  Math.hypot(a.x - b.x, a.y - b.y);
