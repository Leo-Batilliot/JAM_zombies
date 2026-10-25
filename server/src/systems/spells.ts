import { EntityKind, type Config } from "@horde/shared";
import type { Army, Body, World } from "../world/world.js";
import { distance } from "./bodies.js";
import { damage } from "./death.js";
import { enlist } from "./enlist.js";

type Spell = Config["gameplay"]["spells"][string];

const isTarget = (world: World, army: Army, body: Body): boolean => {
  switch (body.kind) {
    case EntityKind.Mage:
    case EntityKind.Unit:
      return (
        body.army !== army && (body.kind !== EntityKind.Mage || body.army.alive)
      );
    case EntityKind.Npc:
      return !world.registries.npcs.get(body.type).obstacle;
  }
};

const nova = (world: World, army: Army, spell: Spell): boolean => {
  const radius = spell.radius ?? 0;
  for (const id of world.grid.queryRadius(army.mage.x, army.mage.y, radius)) {
    const entity = world.entities.get(id);
    if (
      (entity?.kind === EntityKind.Mage ||
        entity?.kind === EntityKind.Unit ||
        entity?.kind === EntityKind.Npc) &&
      isTarget(world, army, entity)
    ) {
      damage(world, entity, spell.damage ?? 0, army);
    }
  }
  return true;
};

const rally = (world: World, army: Army, spell: Spell): boolean => {
  army.rally = {
    until: world.time + (spell.durationSec ?? 0),
    multiplier: spell.multiplier ?? 1,
  };
  return true;
};

const wall = (world: World, army: Army, spell: Spell): boolean => {
  const { mage, heading } = army;
  const dx = mage.targetX - mage.x;
  const dy = mage.targetY - mage.y;
  const length = Math.hypot(dx, dy);
  const dirX = length > 0 ? dx / length : heading.x;
  const dirY = length > 0 ? dy / length : heading.y;
  const offset = spell.offset ?? 0;
  const centerX = mage.x - dirX * offset;
  const centerY = mage.y - dirY * offset;
  const spacing = spell.spacing ?? 1;
  const count = Math.max(1, Math.round((spell.length ?? 0) / spacing));
  const npcs = Array.from({ length: count }, (_, index) => {
    const side = (index - (count - 1) / 2) * spacing;
    return world.addObstacle(
      spell.npc ?? "",
      centerX - dirY * side,
      centerY + dirX * side,
    );
  });
  world.walls.add({ npcs, expiresAt: world.time + (spell.durationSec ?? 0) });
  return true;
};

const raise = (world: World, army: Army, spell: Spell): boolean => {
  if (army.battle !== undefined) {
    return false;
  }
  for (const corpse of [...army.corpses]) {
    if (
      corpse.group === undefined &&
      distance(corpse, army.mage) <= (spell.radius ?? 0)
    ) {
      world.removeEntity(corpse);
      enlist(world, army, corpse, corpse.x, corpse.y);
    }
  }
  return true;
};

const effects: Record<
  Spell["effect"],
  (world: World, army: Army, spell: Spell) => boolean
> = { nova, rally, wall, raise };

export const castSpell = (world: World, army: Army): boolean => {
  if (
    !army.alive ||
    army.spell === undefined ||
    world.time < army.spellReadyAt
  ) {
    return false;
  }
  const spell = world.registries.spells.get(army.spell);
  if (!effects[spell.effect](world, army, spell)) {
    return false;
  }
  army.spellReadyAt = world.time + spell.cooldownSec;
  return true;
};

export const spellCooldown = (world: World, army: Army): number => {
  if (army.spell === undefined) {
    return 0;
  }
  const { cooldownSec } = world.registries.spells.get(army.spell);
  return cooldownSec <= 0
    ? 0
    : Math.max(0, army.spellReadyAt - world.time) / cooldownSec;
};

export const expireWalls = (world: World): void => {
  for (const wall of world.walls) {
    if (world.time >= wall.expiresAt) {
      for (const npc of wall.npcs) {
        if (world.entities.get(npc.id) === npc) {
          world.removeEntity(npc);
        }
      }
      world.walls.delete(wall);
    }
  }
};
