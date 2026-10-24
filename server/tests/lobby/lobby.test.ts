import { describe, expect, test } from "vitest";
import { JoinRejection } from "@horde/shared";
import { joinLobby, leaveLobby, updateLobby } from "../../src/lobby/lobby.js";
import { createBench } from "../support/bench.js";

const bots = (world: { armies: Map<number, { bot: unknown }> }) =>
  [...world.armies.values()].filter((army) => army.bot !== undefined);

const expectJoined = (result: ReturnType<typeof joinLobby>) => {
  if ("rejection" in result) {
    throw new Error("Expected the player to join");
  }
  return result;
};

describe("lobby", () => {
  test("bots fill the lobby up to the minimum", () => {
    const { world, step } = createBench((config) => {
      config.lobby.minParticipants = 4;
    });
    step();
    expect(bots(world)).toHaveLength(4);
    const names = new Set([...world.armies.values()].map((army) => army.name));
    expect(names.size).toBe(4);
  });

  test("a new player replaces the weakest bot, whose troops form a mass grave", () => {
    const { world } = createBench((config) => {
      config.lobby.minParticipants = 2;
    });
    updateLobby(world);
    const [weak, strong] = bots(world) as never as {
      units: Set<unknown>;
    }[];
    const strongArmy = [...world.armies.values()].find(
      (army) => army === (strong as never),
    );
    if (strongArmy === undefined || weak === undefined) {
      throw new Error("Expected two bots");
    }
    world.addUnit(strongArmy, "zombie", strongArmy.mage.x, strongArmy.mage.y);
    const weakCount = weak.units.size;
    const { army } = expectJoined(joinLobby(world, "Ash", ""));
    expect(world.armies.size).toBe(2);
    expect([...world.armies.values()]).toContain(army);
    expect([...world.armies.values()]).toContain(strongArmy);
    const [grave] = [...world.points];
    expect(grave?.corpses).toHaveLength(weakCount);
  });

  test("players beyond the maximum are refused", () => {
    const { world } = createBench((config) => {
      config.lobby.maxParticipants = 2;
    });
    expectJoined(joinLobby(world, "A", ""));
    expectJoined(joinLobby(world, "B", ""));
    expect(joinLobby(world, "C", "")).toEqual({
      rejection: JoinRejection.Full,
    });
  });

  test("a bot takes over a player who leaves", () => {
    const { world } = createBench();
    const { army } = expectJoined(joinLobby(world, "Ash", ""));
    leaveLobby(world, army);
    expect(army.bot).toBeDefined();
    expect(world.armies.size).toBe(1);
  });

  test("the player gets its army back during the grace delay", () => {
    const { config, world, step } = createBench((config) => {
      config.lobby.graceSec = 10;
    });
    const { army, token } = expectJoined(joinLobby(world, "Ash", ""));
    leaveLobby(world, army);
    step(config.network.tickRate * 5);
    const back = expectJoined(joinLobby(world, "Ash", token));
    expect(back.army).toBe(army);
    expect(army.bot).toBeUndefined();
  });

  test("after the grace delay the bot keeps the army", () => {
    const { config, world, step } = createBench((config) => {
      config.lobby.graceSec = 1;
    });
    const { army, token } = expectJoined(joinLobby(world, "Ash", ""));
    leaveLobby(world, army);
    step(config.network.tickRate * 2);
    const back = expectJoined(joinLobby(world, "Ash", token));
    expect(back.army).not.toBe(army);
    expect(army.bot).toBeDefined();
  });

  test("a bot in its grace delay is never replaced", () => {
    const { world } = createBench((config) => {
      config.lobby.minParticipants = 1;
      config.lobby.graceSec = 60;
    });
    const { army } = expectJoined(joinLobby(world, "Ash", ""));
    leaveLobby(world, army);
    expectJoined(joinLobby(world, "Other", ""));
    expect([...world.armies.values()]).toContain(army);
  });

  test("a token of a connected player gives a new army", () => {
    const { world } = createBench();
    const first = expectJoined(joinLobby(world, "Ash", ""));
    const second = expectJoined(joinLobby(world, "Ash", first.token));
    expect(second.army).not.toBe(first.army);
  });
});
