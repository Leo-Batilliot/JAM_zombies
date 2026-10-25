import type { Server } from "node:http";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import {
  BattleFlag,
  CardKind,
  ClientMessageType,
  EntityKind,
  JoinRejection,
  ProtocolError,
  ServerMessageType,
  decodeClientMessage,
  encodeServerMessage,
  neutralArmy,
  socketPath,
  spectatorMageId,
  toClientConfig,
  type Card,
  type ClientMessage,
  type LeaderboardEntry,
  type RunStats,
  type ServerMessage,
} from "@horde/shared";
import { validatePlayerName } from "../lobby/name.js";
import { rankArmies } from "../lobby/leaderboard.js";
import type { Lobbies } from "../lobby/lobbies.js";
import { joinLobby, leaveLobby, skinId } from "../lobby/lobby.js";
import { runDemo } from "../systems/demo.js";
import {
  orderAttack,
  orderCard,
  orderCast,
  orderMove,
  orderRespawn,
} from "../systems/orders.js";
import { spellCooldown } from "../systems/spells.js";
import { sightedMages, visionBonus } from "../systems/detection.js";
import { powerPace } from "../systems/pace.js";
import { maxHp, soulsToReach } from "../systems/souls.js";
import {
  formationCooldown,
  formationIds,
  formationIndex,
  orderFormation,
} from "../systems/tactics.js";
import { armyPotential, armyStrength } from "../systems/strength.js";
import type { Army, Card as ArmyCard, World } from "../world/world.js";
import { SnapshotDelta } from "./delta.js";
import { visibleEntities, type View } from "./interest.js";
import { updateFocus, type Focus } from "./spectate.js";

const protocolErrorCode = 1008;

interface Session {
  socket: WebSocket;
  world: World;
  army?: Army;
  focus?: Focus;
  deaths: number;
  view: View;
  bosses: Map<string, number | undefined>;
  delta: SnapshotDelta;
}

const toBytes = (data: RawData): Uint8Array =>
  Array.isArray(data)
    ? Buffer.concat(data)
    : data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : data;

const emptyRun: RunStats = {
  maxPower: 0,
  survivalSec: 0,
  infected: 0,
  kills: 0,
  mageKills: 0,
  level: 1,
  mutations: [],
};

const cardOf = (world: World, card: ArmyCard): Card => {
  switch (card.kind) {
    case "mutation":
      return {
        kind: CardKind.Mutation,
        index: world.registries.units.index(card.unit),
      };
    case "gift":
      return {
        kind: CardKind.Gift,
        index: world.registries.gifts.index(card.gift),
      };
    case "spell":
      return {
        kind: CardKind.Spell,
        index: world.registries.spells.index(card.spell),
      };
  }
};

const battleFlags = (army: Army): number =>
  army.battle === undefined ? 0 : BattleFlag.InBattle;

export interface SocketOptions {
  demo: boolean;
}

export const attachSockets = (
  server: Server,
  lobbies: Lobbies,
  options: SocketOptions = { demo: false },
) => {
  const { config } = lobbies;
  const sessions = new Set<Session>();
  const sockets = new WebSocketServer({
    server,
    path: socketPath,
    maxPayload: config.network.maxMessageBytes,
  });

  const send = (session: Session, message: ServerMessage): void => {
    if (session.socket.readyState === WebSocket.OPEN) {
      session.socket.send(encodeServerMessage(message, config.world));
    }
  };

  const reject = (session: Session, reason: JoinRejection): void => {
    send(session, { type: ServerMessageType.Rejected, reason });
  };

  const join = (
    session: Session,
    name: string,
    token: string,
    skin: number,
  ): void => {
    const validName = validatePlayerName(name, config.lobby.playerName);
    if (validName === undefined) {
      reject(session, JoinRejection.InvalidName);
      return;
    }
    const world = lobbies.place(token);
    if (world === undefined) {
      reject(session, JoinRejection.Full);
      return;
    }
    const result = joinLobby(world, validName, token, skinId(world, skin));
    if ("rejection" in result) {
      reject(session, result.rejection);
      return;
    }
    session.world = world;
    session.army = result.army;
    session.deaths = result.army.deaths;
    send(session, {
      type: ServerMessageType.Welcome,
      mageId: result.army.mage.id,
      token: result.token,
    });
  };

  const spectate = (session: Session): void => {
    const watching = [...sessions].filter(
      (other) => other.focus !== undefined,
    ).length;
    if (watching >= config.lobby.spectators.max) {
      reject(session, JoinRejection.Full);
      return;
    }
    session.world = lobbies.main;
    session.focus = { army: undefined, until: -Infinity };
    send(session, {
      type: ServerMessageType.Welcome,
      mageId: spectatorMageId,
      token: "",
    });
  };

  const searchProgress = (world: World, army: Army): number => {
    const point =
      army.search === undefined
        ? undefined
        : world.entities.get(army.search.pointId);
    if (
      army.search === undefined ||
      point?.kind !== EntityKind.PointOfInterest
    ) {
      return 0;
    }
    const { searchSec } = world.registries.pointsOfInterest.get(point.type);
    return searchSec > 0 ? army.search.progress / searchSec : 1;
  };

  const crossStrengths = (world: World, army: Army) =>
    [...world.crosses].flatMap((cross) => {
      const strength = cross.strengths.get(army) ?? 0;
      return strength > 0 ? [{ id: cross.id, strength }] : [];
    });

  const bossHealth = (world: World) =>
    [...world.events].flatMap(([type, state]) =>
      state.boss === undefined || !world.registries.events.has(type)
        ? []
        : [
            {
              event: world.registries.events.index(type),
              hp: state.boss.hp,
              maxHp: world.registries.npcs.get(state.boss.type).hp,
            },
          ],
    );

  const bounty = (world: World, leader: LeaderboardEntry | undefined) => {
    const army =
      leader === undefined ? undefined : world.armies.get(leader.army);
    return army === undefined || !army.alive || (leader?.strength ?? 0) <= 0
      ? { army: neutralArmy, x: 0, y: 0 }
      : { army: army.slot, x: army.mage.x, y: army.mage.y };
  };

  const sendLeaderboards = (world: World): void => {
    const ranking = rankArmies(world);
    const target = bounty(world, ranking.entries[0]);
    for (const session of sessions) {
      if (
        session.world === world &&
        (session.army !== undefined || session.focus !== undefined)
      ) {
        send(session, {
          type: ServerMessageType.Leaderboard,
          rank:
            session.army === undefined
              ? 0
              : (ranking.ranks.get(session.army) ?? ranking.total),
          total: ranking.total,
          entries: ranking.entries,
          bounty: target,
        });
      }
    }
  };

  const sendEvents = (session: Session, army: Army | undefined): void => {
    const { world } = session;
    for (const [type, state] of world.events) {
      const bossId = state.boss?.id;
      const known = session.bosses.get(type);
      if (bossId === known || !world.registries.events.has(type)) {
        continue;
      }
      const event = world.registries.events.index(type);
      if (known !== undefined) {
        send(session, {
          type: ServerMessageType.EventEnded,
          event,
          defeated: state.result?.defeated ?? false,
          souls:
            army === undefined ? 0 : (state.result?.rewards.get(army) ?? 0),
        });
      }
      if (state.boss !== undefined) {
        send(session, {
          type: ServerMessageType.EventStarted,
          event,
          x: state.boss.x,
          y: state.boss.y,
        });
      }
      session.bosses.set(type, bossId);
    }
  };

  const handle = (session: Session, message: ClientMessage): void => {
    if (session.focus !== undefined) {
      if (message.type === ClientMessageType.View) {
        session.view = { width: message.width, height: message.height };
      }
      return;
    }
    if (session.army === undefined) {
      if (message.type === ClientMessageType.Join) {
        join(session, message.name, message.token, message.skin);
      } else if (message.type === ClientMessageType.Spectate) {
        spectate(session);
      } else {
        throw new ProtocolError("Message before join");
      }
      return;
    }
    const { world } = session;
    switch (message.type) {
      case ClientMessageType.View:
        session.view = { width: message.width, height: message.height };
        break;
      case ClientMessageType.Move:
        orderMove(world, session.army, message.x, message.y);
        break;
      case ClientMessageType.Target:
        orderAttack(world, session.army, message.entityId);
        break;
      case ClientMessageType.Formation:
        orderFormation(
          world,
          session.army,
          formationIds(world)[message.formation],
        );
        break;
      case ClientMessageType.Choose:
        orderCard(world, session.army, message.card);
        break;
      case ClientMessageType.Cast:
        orderCast(world, session.army);
        break;
      case ClientMessageType.Respawn:
        orderRespawn(session.army);
        break;
      case ClientMessageType.Demo:
        if (options.demo) {
          runDemo(world, session.army, message.command);
        }
        break;
      default:
        break;
    }
  };

  sockets.on("connection", (socket) => {
    const session: Session = {
      socket,
      world: lobbies.main,
      deaths: 0,
      view: { width: 0, height: 0 },
      bosses: new Map(),
      delta: new SnapshotDelta(),
    };
    sessions.add(session);
    send(session, {
      type: ServerMessageType.Config,
      config: toClientConfig(config),
    });
    socket.on("message", (data, isBinary) => {
      try {
        if (!isBinary) {
          throw new ProtocolError("Text message");
        }
        handle(session, decodeClientMessage(toBytes(data), config.world));
      } catch (error) {
        if (!(error instanceof ProtocolError)) {
          throw error;
        }
        socket.close(protocolErrorCode, error.message);
      }
    });
    socket.on("close", () => {
      sessions.delete(session);
      if (session.army !== undefined) {
        leaveLobby(session.world, session.army);
      }
    });
  });

  const leaderboardAt = new WeakMap<World, number>();

  const sendSpectator = (session: Session, focus: Focus): void => {
    const { world } = session;
    if (updateFocus(world, focus)) {
      send(session, {
        type: ServerMessageType.Focus,
        army: focus.army?.slot ?? neutralArmy,
        mageId: focus.army?.mage.id ?? spectatorMageId,
        name: focus.army?.name ?? "",
      });
    }
    sendEvents(session, undefined);
    send(session, {
      type: ServerMessageType.Snapshot,
      tick: world.tick,
      ...session.delta.next(
        visibleEntities(world, focus.army, session.view),
        config.world,
      ),
    });
  };

  return {
    sessions,
    broadcastConfig: (): void => {
      for (const session of sessions) {
        send(session, {
          type: ServerMessageType.Config,
          config: toClientConfig(config),
        });
      }
    },
    sendSnapshots: (world: World = lobbies.main): void => {
      if (world.time >= (leaderboardAt.get(world) ?? -Infinity)) {
        leaderboardAt.set(
          world,
          world.time + config.lobby.leaderboard.intervalSec,
        );
        sendLeaderboards(world);
      }
      for (const session of sessions) {
        if (session.world !== world) {
          continue;
        }
        if (session.focus !== undefined) {
          sendSpectator(session, session.focus);
          continue;
        }
        if (session.army === undefined) {
          continue;
        }
        const { army } = session;
        if (army.deaths !== session.deaths) {
          session.deaths = army.deaths;
          send(session, {
            type: ServerMessageType.Died,
            killer: army.killerName,
            stats: army.lastRun ?? emptyRun,
          });
        }
        sendEvents(session, army);
        for (const item of army.found) {
          if (world.registries.items.has(item)) {
            send(session, {
              type: ServerMessageType.Loot,
              item: world.registries.items.index(item),
            });
          }
        }
        send(session, {
          type: ServerMessageType.Status,
          army: army.slot,
          hp: army.alive ? army.mage.hp : 0,
          maxHp: maxHp(world, army),
          level: army.level,
          souls: army.souls,
          levelSouls: soulsToReach(army.level, config.gameplay.souls),
          nextSouls: soulsToReach(army.level + 1, config.gameplay.souls),
          units: army.units.size,
          strength: armyStrength(world, army),
          potential: armyPotential(world, army),
          pace: powerPace(world, army),
          battle: battleFlags(army),
          search: searchProgress(world, army),
          formation: formationIndex(world, army.formation),
          formationCooldown: formationCooldown(world, army),
          cards: army.cards.map((card) => cardOf(world, card)),
          spell:
            army.spell === undefined
              ? 0
              : world.registries.spells.index(army.spell) + 1,
          spellCooldown: spellCooldown(world, army),
          vision: visionBonus(world, army),
          crosses: crossStrengths(world, army),
          bosses: bossHealth(world),
          mages: sightedMages(world, army),
        });
        send(session, {
          type: ServerMessageType.Snapshot,
          tick: world.tick,
          ...session.delta.next(
            visibleEntities(world, army, session.view),
            config.world,
          ),
        });
      }
    },
    close: (): Promise<void> =>
      new Promise((resolve) => {
        for (const session of sessions) {
          session.socket.terminate();
        }
        sockets.close(() => {
          resolve();
        });
      }),
  };
};
