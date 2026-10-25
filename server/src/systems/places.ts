import { EntityKind, type Config, type District } from "@horde/shared";
import { distanceToMages } from "../world/spawn.js";
import type { PlaceState, World } from "../world/world.js";
import { bodyLayer, bodyRadius } from "./bodies.js";
import { spawnPoint } from "./points.js";

type Place = Config["world"]["places"][string];

const onRampart = (
  world: World,
  x: number,
  y: number,
): { x: number; y: number } => {
  const { width, height, city } = world.config.world;
  const middle = city.border / 2;
  const edges = [
    { gap: x, point: { x: middle, y } },
    { gap: width - x, point: { x: width - middle, y } },
    { gap: y, point: { x, y: middle } },
    { gap: height - y, point: { x, y: height - middle } },
  ];
  return edges.reduce((best, edge) => (edge.gap < best.gap ? edge : best))
    .point;
};

const center = (
  world: World,
  district: District,
  place: Place,
): { x: number; y: number } => {
  const x = district.x + place.at[0] * district.size;
  const y = district.y + place.at[1] * district.size;
  return place.rampart === true ? onRampart(world, x, y) : { x, y };
};

export const championExists = (world: World, type: string): boolean => {
  for (const entity of world.entities.values()) {
    if (
      (entity.kind === EntityKind.Unit ||
        entity.kind === EntityKind.Npc ||
        entity.kind === EntityKind.Corpse) &&
      entity.type === type
    ) {
      return true;
    }
  }
  return false;
};

const garrison = (
  world: World,
  place: Place,
  marker: number,
  x: number,
  y: number,
): PlaceState["camp"] => {
  const camp = world.addCamp(x, y, Infinity, marker);
  for (const { npc, count } of place.defenders) {
    for (let index = 0; index < count; index++) {
      const near = world.randomNear(x, y, place.spread);
      const defender = world.addCampNpc(camp, npc, near.x, near.y);
      const free =
        bodyLayer(world, defender) === "air"
          ? near
          : world.freePoint(
              defender.x,
              defender.y,
              bodyRadius(world, defender),
            );
      world.setPosition(defender, free.x, free.y);
      defender.homeX = free.x;
      defender.homeY = free.y;
    }
  }
  return camp;
};

const fillGas = (
  world: World,
  place: Place,
  state: PlaceState,
  x: number,
  y: number,
): void => {
  const { gas } = place;
  if (gas === undefined) {
    return;
  }
  for (const mist of state.gas) {
    if (!world.entities.has(mist.id)) {
      state.gas.delete(mist);
    }
  }
  while (state.gas.size < gas.count) {
    const near = world.randomNear(x, y, gas.spread);
    const free = world.freePoint(near.x, near.y, 0);
    state.gas.add(world.addMist(gas.mist, free.x, free.y, Infinity));
  }
};

const fireMortar = (
  world: World,
  place: Place,
  state: PlaceState,
  x: number,
  y: number,
): void => {
  const { mortar } = place;
  if (
    mortar === undefined ||
    state.camp === undefined ||
    world.time < state.mortarAt ||
    ![...state.camp.defenders].some((npc) => npc.type === mortar.npc)
  ) {
    return;
  }
  state.mortarAt = world.time + mortar.intervalSec;
  const { spread, delaySec } = world.config.world.bombings;
  for (const army of world.armies.values()) {
    const { mage } = army;
    if (army.alive && Math.hypot(mage.x - x, mage.y - y) <= mortar.range) {
      const target = world.randomNear(mage.x, mage.y, spread);
      world.addBombing(target.x, target.y, delaySec);
    }
  }
};

const updatePlace = (
  world: World,
  place: Place,
  marker: number,
  state: PlaceState,
  district: District,
): void => {
  const { x, y } = center(world, district, place);
  const { camp } = state;
  if (camp !== undefined && camp.defenders.size === 0) {
    const spot = world.freePoint(x, y, world.config.world.city.clearance);
    spawnPoint(world, place.chest, spot.x, spot.y);
    world.removeEntity(camp);
    state.camp = undefined;
    state.respawnAt = world.time + place.respawnSec;
  }
  if (
    state.camp === undefined &&
    world.time >= state.respawnAt &&
    distanceToMages(world, x, y) >= place.safeDistance &&
    (place.champion === undefined || !championExists(world, place.champion))
  ) {
    state.camp = garrison(world, place, marker, x, y);
  }
  fillGas(world, place, state, x, y);
  fireMortar(world, place, state, x, y);
};

export const maintainPlaces = (world: World): void => {
  Object.entries(world.config.world.places).forEach(
    ([placeId, place], index) => {
      world.city.districts.forEach((district, districtIndex) => {
        if (district.template !== place.district) {
          return;
        }
        const key = `${placeId}:${String(districtIndex)}`;
        const state = world.places.get(key) ?? {
          camp: undefined,
          respawnAt: world.time,
          mortarAt: world.time,
          gas: new Set(),
        };
        world.places.set(key, state);
        updatePlace(world, place, index + 1, state, district);
      });
    },
  );
};
