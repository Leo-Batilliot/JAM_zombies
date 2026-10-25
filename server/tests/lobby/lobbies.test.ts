import { describe, expect, test } from "vitest";
import { Lobbies } from "../../src/lobby/lobbies.js";
import {
  joinLobby,
  leaveLobby,
  skinId,
  updateLobby,
} from "../../src/lobby/lobby.js";
import { World } from "../../src/world/world.js";
import { createBench } from "../support/bench.js";

const setup = (maxParticipants: number, maxLobbies: number) => {
  const bench = createBench((config) => {
    config.lobby.maxParticipants = maxParticipants;
    config.lobby.maxLobbies = maxLobbies;
  });
  const ticks = new Map<World, () => void>();
  const stopped = new Set<World>();
  let created = 0;
  const lobbies = new Lobbies(
    bench.config,
    () =>
      created++ === 0
        ? bench.world
        : new World(bench.config, bench.world.registries),
    (world, afterTick) => {
      ticks.set(world, afterTick);
      return () => {
        stopped.add(world);
      };
    },
  );
  const enter = (name: string, token = "") => {
    const world = lobbies.place(token);
    if (world === undefined) {
      return undefined;
    }
    const result = joinLobby(world, name, token);
    return "army" in result ? { world, ...result } : undefined;
  };
  return { bench, lobbies, ticks, stopped, enter };
};

describe("multiple lobbies", () => {
  test("a new lobby opens when the first one is full", () => {
    const { bench, lobbies, enter } = setup(1, 3);
    const first = enter("Ash");
    const second = enter("Bub");
    expect(first?.world).toBe(bench.world);
    expect(second?.world).not.toBe(bench.world);
    expect(lobbies.worlds).toHaveLength(2);
    expect(second?.world.armies.size).toBe(1);
  });

  test("players are refused once every lobby is full", () => {
    const { lobbies, enter } = setup(1, 2);
    enter("Ash");
    enter("Bub");
    expect(lobbies.place("")).toBeUndefined();
    expect(lobbies.worlds).toHaveLength(2);
  });

  test("a returning player goes back to its own lobby", () => {
    const { lobbies, enter } = setup(1, 3);
    enter("Ash");
    const second = enter("Bub");
    if (second === undefined) {
      throw new Error("Expected a second player");
    }
    leaveLobby(second.world, second.army);
    expect(lobbies.place(second.token)).toBe(second.world);
  });

  test("a lobby without players closes, never the first one", () => {
    const { bench, lobbies, ticks, stopped, enter } = setup(1, 3);
    const first = enter("Ash");
    const second = enter("Bub");
    if (first === undefined || second === undefined) {
      throw new Error("Expected two players");
    }
    leaveLobby(second.world, second.army);
    ticks.get(second.world)?.();
    expect(lobbies.worlds).toHaveLength(2);
    second.world.reconnects.clear();
    ticks.get(second.world)?.();
    expect(lobbies.worlds).toEqual([bench.world]);
    expect(stopped.has(second.world)).toBe(true);
    first.world.reconnects.clear();
    ticks.get(bench.world)?.();
    expect(lobbies.worlds).toEqual([bench.world]);
  });

  test("each tick of a lobby is reported with its world", () => {
    const { bench, lobbies, ticks } = setup(1, 3);
    const seen: World[] = [];
    lobbies.onTick = (world) => {
      seen.push(world);
    };
    ticks.get(bench.world)?.();
    expect(seen).toEqual([bench.world]);
  });
});

describe("mage skins", () => {
  test("a skin index becomes its id, unknown indexes use the first skin", () => {
    const { world, config } = createBench();
    const ids = Object.keys(config.gameplay.mage.skins);
    expect(skinId(world, 1)).toBe(ids[1]);
    expect(skinId(world, 200)).toBe(ids[0]);
  });

  test("a player keeps its skin and can change it when coming back", () => {
    const { world, config } = createBench();
    const ids = Object.keys(config.gameplay.mage.skins);
    const result = joinLobby(world, "Ash", "", ids[2]);
    if (!("army" in result)) {
      throw new Error("Expected an army");
    }
    expect(result.army.skin).toBe(ids[2]);
    leaveLobby(world, result.army);
    joinLobby(world, "Ash", result.token, ids[1]);
    expect(result.army.skin).toBe(ids[1]);
  });

  test("bots wear the first skin", () => {
    const { world, config } = createBench((config) => {
      config.lobby.minParticipants = 3;
    });
    updateLobby(world);
    const ids = Object.keys(config.gameplay.mage.skins);
    expect(world.armies.size).toBe(3);
    for (const army of world.armies.values()) {
      expect(army.skin).toBe(ids[0]);
    }
  });
});
