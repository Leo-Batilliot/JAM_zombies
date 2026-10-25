import { EntityKind } from "@horde/shared";
import type {
  AbandonedGroup,
  Army,
  Body,
  BossEvent,
  Camp,
  Force,
  Npc,
  World,
} from "../world/world.js";
import { distance } from "./bodies.js";
import { currentTarget } from "./targeting.js";
import { transferToKiller } from "./transfer.js";

type ForceKey = Army | AbandonedGroup | BossEvent | Camp | Npc;

export const isHostile = (world: World, npc: Npc): boolean =>
  world.registries.npcs.get(npc.type).attack !== undefined;

export const mainBodies = (army: Army): Body[] => {
  const bodies: Body[] = army.alive ? [army.mage] : [];
  for (const unit of army.units) {
    if (unit.group === undefined) {
      bodies.push(unit);
    }
  }
  return bodies;
};

export const enclose = (army: Army | undefined, bodies: Body[]): Force => {
  let x = 0;
  let y = 0;
  for (const body of bodies) {
    x += body.x;
    y += body.y;
  }
  x /= bodies.length || 1;
  y /= bodies.length || 1;
  let radius = 0;
  for (const body of bodies) {
    radius = Math.max(radius, Math.hypot(body.x - x, body.y - y));
  }
  return { army, bodies, x, y, radius };
};

const eventOf = (world: World, npc: Npc): BossEvent | undefined =>
  npc.event === undefined ? undefined : world.events.get(npc.event);

const forceKey = (world: World, body: Body): ForceKey => {
  switch (body.kind) {
    case EntityKind.Mage:
      return body.army;
    case EntityKind.Unit:
      return body.group ?? body.army;
    case EntityKind.Npc:
      return body.camp ?? eventOf(world, body) ?? body;
  }
};

const forceOfBody = (world: World, body: Body): Force => {
  switch (body.kind) {
    case EntityKind.Mage:
      return enclose(body.army, mainBodies(body.army));
    case EntityKind.Unit:
      return enclose(
        body.army,
        body.group === undefined
          ? mainBodies(body.army)
          : [...body.group.units],
      );
    case EntityKind.Npc: {
      if (body.camp !== undefined) {
        return enclose(undefined, [...body.camp.defenders]);
      }
      const event = eventOf(world, body);
      if (event === undefined) {
        return enclose(undefined, [body]);
      }
      const bodies: Body[] = [...event.minions];
      if (event.boss !== undefined) {
        bodies.push(event.boss);
      }
      return enclose(undefined, bodies);
    }
  }
};

export const nearestFoe = (army: Army, foes: Force[]): number => {
  let nearest = Infinity;
  for (const foe of foes) {
    for (const body of foe.bodies) {
      nearest = Math.min(nearest, distance(body, army.mage));
    }
  }
  return nearest;
};

const resolveGroups = (world: World, army: Army): void => {
  const { endDelaySec } = world.config.gameplay.battle;
  for (const group of army.groups) {
    if (group.units.size === 0) {
      for (const corpse of [...group.corpses]) {
        transferToKiller(world, corpse);
      }
    } else if (world.time - group.engagedAt >= endDelaySec) {
      for (const unit of group.units) {
        unit.group = undefined;
        unit.returning = true;
      }
      for (const corpse of group.corpses) {
        corpse.group = undefined;
      }
    } else {
      continue;
    }
    army.groups.delete(group);
  }
};

export const updateBattles = (world: World): void => {
  const { engageRadius, endDelaySec } = world.config.gameplay.battle;
  const forces = new Map<ForceKey, Force>();
  const foes = new Map<ForceKey, Map<ForceKey, Force>>();

  const forceOf = (body: Body): [ForceKey, Force] => {
    const key = forceKey(world, body);
    let force = forces.get(key);
    if (force === undefined) {
      force = forceOfBody(world, body);
      forces.set(key, force);
    }
    return [key, force];
  };
  const addFoe = (key: ForceKey, foeKey: ForceKey, foe: Force): void => {
    let known = foes.get(key);
    if (known === undefined) {
      known = new Map();
      foes.set(key, known);
    }
    known.set(foeKey, foe);
  };
  const link = (a: Body, b: Body): void => {
    if (distance(a, b) > engageRadius) {
      return;
    }
    const [aKey, aForce] = forceOf(a);
    const [bKey, bForce] = forceOf(b);
    if (aKey === bKey) {
      return;
    }
    addFoe(aKey, bKey, bForce);
    addFoe(bKey, aKey, aForce);
  };

  for (const army of world.armies.values()) {
    for (const unit of army.units) {
      const target = currentTarget(world, unit);
      if (
        target !== undefined &&
        (target.kind !== EntityKind.Npc || isHostile(world, target))
      ) {
        link(unit, target);
      }
    }
  }
  for (const npc of world.hostiles) {
    const prey =
      npc.targetId === undefined ? undefined : world.entities.get(npc.targetId);
    if (prey?.kind === EntityKind.Mage || prey?.kind === EntityKind.Unit) {
      link(npc, prey);
    }
  }

  for (const army of world.armies.values()) {
    const engaged = foes.get(army);
    if (!army.alive) {
      army.battle = undefined;
    } else if (engaged !== undefined) {
      const foeForces = [...engaged.values()];
      const nearest = nearestFoe(army, foeForces);
      army.battle = {
        engagedAt: world.time,
        foes: foeForces,
        closest: Math.min(army.battle?.closest ?? nearest, nearest),
      };
    } else if (
      army.battle !== undefined &&
      world.time - army.battle.engagedAt >= endDelaySec
    ) {
      army.battle = undefined;
    }
    for (const group of army.groups) {
      if (foes.has(group)) {
        group.engagedAt = world.time;
      }
    }
    resolveGroups(world, army);
  }
};
