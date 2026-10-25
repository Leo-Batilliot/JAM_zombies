import { EntityKind, type Config } from "@horde/shared";
import type { Army, Mage, Npc, Unit, World } from "../world/world.js";
import { distance } from "./bodies.js";
import { damage } from "./death.js";

type Abilities = Config["units"]["champions"][string]["abilities"];
type Fighter = Unit | Npc;
type Target = Mage | Unit | Npc;

export const abilitiesOf = (
  world: World,
  type: string,
): Abilities | undefined => world.config.units.champions[type]?.abilities;

const armyOf = (fighter: Fighter): Army | undefined =>
  fighter.kind === EntityKind.Unit ? fighter.army : undefined;

const isEnemy = (fighter: Fighter, other: Target): boolean => {
  const army = armyOf(fighter);
  if (other.kind === EntityKind.Npc) {
    return army !== undefined;
  }
  return other.army !== army;
};

const maxHpOf = (world: World, target: Unit | Npc): number =>
  target.kind === EntityKind.Unit
    ? world.unitMaxHp(target.type, target.item)
    : world.registries.npcs.get(target.type).hp;

const bodiesNear = (
  world: World,
  x: number,
  y: number,
  radius: number,
): Target[] =>
  world.grid.queryRadius(x, y, radius).flatMap((id) => {
    const entity = world.entities.get(id);
    return entity?.kind === EntityKind.Unit ||
      entity?.kind === EntityKind.Npc ||
      entity?.kind === EntityKind.Mage
      ? [entity]
      : [];
  });

export const strike = (
  world: World,
  fighter: Fighter,
  target: Target,
  amount: number,
  attackerName?: string,
): void => {
  const abilities = abilitiesOf(world, fighter.type);
  const army = armyOf(fighter);
  const name = attackerName ?? army?.name ?? "";
  const execute =
    abilities?.execute !== undefined &&
    target.kind !== EntityKind.Mage &&
    target.hp < maxHpOf(world, target) * abilities.execute;
  damage(world, target, execute ? target.hp + amount : amount, army, name);
  const cleave = abilities?.cleave;
  if (cleave === undefined) {
    return;
  }
  for (const other of bodiesNear(world, target.x, target.y, cleave.radius)) {
    if (
      other !== target &&
      other.kind !== EntityKind.Mage &&
      isEnemy(fighter, other)
    ) {
      damage(world, other, amount * cleave.ratio, army, name);
    }
  }
};

const charge = (world: World, fighter: Fighter, abilities: Abilities): void => {
  const { charge: settings } = abilities;
  if (
    settings === undefined ||
    !fighter.fighting ||
    world.time < (world.abilityAt.get(fighter.id) ?? 0)
  ) {
    return;
  }
  world.abilityAt.set(fighter.id, world.time + settings.intervalSec);
  const army = armyOf(fighter);
  for (const other of bodiesNear(
    world,
    fighter.x,
    fighter.y,
    settings.radius,
  )) {
    if (
      other.kind !== EntityKind.Unit ||
      !isEnemy(fighter, other) ||
      world.registries.units.get(other.type).strength > settings.maxStrength
    ) {
      continue;
    }
    const gap = distance(fighter, other) || 1;
    world.setPosition(
      other,
      other.x + ((other.x - fighter.x) / gap) * settings.knockback,
      other.y + ((other.y - fighter.y) / gap) * settings.knockback,
    );
    damage(world, other, settings.damage, army, army?.name ?? "");
  }
};

const heal = (
  world: World,
  fighter: Fighter,
  abilities: Abilities,
  dt: number,
): void => {
  const army = armyOf(fighter);
  if (abilities.heal === undefined || army === undefined) {
    return;
  }
  const { radius, perSec } = abilities.heal;
  for (const other of bodiesNear(world, fighter.x, fighter.y, radius)) {
    if (other.kind === EntityKind.Unit && other.army === army) {
      other.hp = Math.min(maxHpOf(world, other), other.hp + perSec * dt);
    }
  }
};

const dive = (world: World, fighter: Fighter, abilities: Abilities): void => {
  if (abilities.prefersBack !== true) {
    return;
  }
  const current =
    fighter.targetId === undefined
      ? undefined
      : world.entities.get(fighter.targetId);
  if (
    current?.kind === EntityKind.Unit &&
    world.registries.units.get(current.type).rank === "back"
  ) {
    return;
  }
  const range =
    fighter.kind === EntityKind.Unit
      ? world.registries.units.get(fighter.type).aggroRange
      : (world.registries.npcs.get(fighter.type).attack?.aggroRange ?? 0);
  let best: Unit | undefined;
  for (const other of bodiesNear(world, fighter.x, fighter.y, range)) {
    if (
      other.kind === EntityKind.Unit &&
      isEnemy(fighter, other) &&
      world.registries.units.get(other.type).rank === "back" &&
      (best === undefined || distance(fighter, other) < distance(fighter, best))
    ) {
      best = other;
    }
  }
  if (best !== undefined) {
    fighter.targetId = best.id;
  }
};

const fighters = function* (world: World): Generator<Fighter> {
  const { champions } = world.config.units;
  for (const army of world.armies.values()) {
    for (const unit of army.units) {
      if (Object.hasOwn(champions, unit.type)) {
        yield unit;
      }
    }
  }
  for (const npc of world.hostiles) {
    if (Object.hasOwn(champions, npc.type)) {
      yield npc;
    }
  }
};

export const runAbilities = (world: World, dt: number): void => {
  for (const fighter of fighters(world)) {
    const abilities = abilitiesOf(world, fighter.type);
    if (abilities !== undefined) {
      dive(world, fighter, abilities);
      charge(world, fighter, abilities);
      heal(world, fighter, abilities, dt);
    }
  }
  for (const id of world.abilityAt.keys()) {
    if (!world.entities.has(id)) {
      world.abilityAt.delete(id);
    }
  }
};
