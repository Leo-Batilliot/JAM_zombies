import { EntityKind, type AggroCircle } from "@horde/shared";
import type {
  AbandonedGroup,
  Army,
  Body,
  BossEvent,
  Force,
  Npc,
  World,
} from "../world/world.js";
import { distance } from "./bodies.js";
import { currentTarget } from "./targeting.js";
import { transferToKiller } from "./transfer.js";

type ForceKey = Army | AbandonedGroup | BossEvent | Npc;

const fullTurn = 2 * Math.PI;

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
      return eventOf(world, body) ?? body;
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

const mainArmy = (body: Body): Army | undefined =>
  body.kind === EntityKind.Mage ||
  (body.kind === EntityKind.Unit && body.group === undefined)
    ? body.army
    : undefined;

export const freeSector = (
  x: number,
  y: number,
  threats: Body[],
): { size: number; middle: number } => {
  const angles = threats
    .map((threat) => Math.atan2(threat.y - y, threat.x - x))
    .sort((a, b) => a - b);
  const first = angles[0];
  const last = angles.at(-1);
  if (first === undefined || last === undefined) {
    return { size: fullTurn, middle: 0 };
  }
  let size = first + fullTurn - last;
  let middle = last + size / 2;
  for (let index = 1; index < angles.length; index++) {
    const from = angles[index - 1] ?? 0;
    const gap = (angles[index] ?? 0) - from;
    if (gap > size) {
      size = gap;
      middle = from + gap / 2;
    }
  }
  return { size, middle };
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
  const { engageRadius, endDelaySec, freeSectorDeg } =
    world.config.gameplay.battle;
  const forces = new Map<ForceKey, Force>();
  const foes = new Map<ForceKey, Map<ForceKey, Force>>();
  const threats = new Map<Army, Body[]>();

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
  const addThreat = (body: Body, threat: Body): void => {
    const army = mainArmy(body);
    if (army !== undefined) {
      let known = threats.get(army);
      if (known === undefined) {
        known = [];
        threats.set(army, known);
      }
      known.push(threat);
    }
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
    addThreat(a, b);
    addThreat(b, a);
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
      const center = forces.get(army) ?? enclose(army, mainBodies(army));
      const sector = freeSector(center.x, center.y, threats.get(army) ?? []);
      army.battle = {
        engagedAt: world.time,
        foes: [...engaged.values()],
        encircled: sector.size < (freeSectorDeg * Math.PI) / 180,
        freeSector: sector.size,
        escapeAngle: sector.middle,
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

export const aggroCircles = (world: World, army: Army): AggroCircle[] => {
  const { circleMargin } = world.config.gameplay.battle;
  return (army.battle?.foes ?? [])
    .filter((foe) => foe.bodies.length > 0)
    .map((foe) => ({ x: foe.x, y: foe.y, radius: foe.radius + circleMargin }));
};

const outside = (
  circles: AggroCircle[],
  x: number,
  y: number,
): { gap: number; circle: AggroCircle | undefined } => {
  let gap = Infinity;
  let nearest: AggroCircle | undefined;
  for (const circle of circles) {
    const circleGap = Math.hypot(x - circle.x, y - circle.y) - circle.radius;
    if (circleGap < gap) {
      gap = circleGap;
      nearest = circle;
    }
  }
  return { gap, circle: nearest };
};

export const clampToCircles = (
  circles: AggroCircle[],
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number } => {
  if (circles.length === 0) {
    return to;
  }
  const allowed = Math.max(0, outside(circles, from.x, from.y).gap);
  const { gap, circle } = outside(circles, to.x, to.y);
  if (gap <= allowed || circle === undefined) {
    return to;
  }
  const dx = to.x - circle.x;
  const dy = to.y - circle.y;
  const length = Math.hypot(dx, dy);
  const radius = circle.radius + allowed;
  return {
    x: circle.x + (dx / length) * radius,
    y: circle.y + (dy / length) * radius,
  };
};
