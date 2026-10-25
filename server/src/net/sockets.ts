import type { Server } from "node:http";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import {
  BattleFlag,
  ClientMessageType,
  EntityKind,
  JoinRejection,
  ProtocolError,
  ServerMessageType,
  decodeClientMessage,
  encodeServerMessage,
  socketPath,
  toClientConfig,
  type ClientMessage,
  type ServerMessage,
} from "@horde/shared";
import { validatePlayerName } from "../lobby/name.js";
import { rankArmies } from "../lobby/leaderboard.js";
import { joinLobby, leaveLobby } from "../lobby/lobby.js";
import { runDemo } from "../systems/demo.js";
import { aggroCircles } from "../systems/battle.js";
import { evolvableCounts } from "../systems/evolution.js";
import {
  orderAttack,
  orderEvolve,
  orderMove,
  orderRetreat,
} from "../systems/orders.js";
import { maxHp } from "../systems/souls.js";
import { armyStrength } from "../systems/strength.js";
import type { Army, World } from "../world/world.js";
import { SnapshotDelta } from "./delta.js";
import { visibleEntities, type View } from "./interest.js";

const protocolErrorCode = 1008;

interface Session {
  socket: WebSocket;
  army?: Army;
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

const battleFlags = (army: Army): number =>
  (army.battle === undefined ? 0 : BattleFlag.InBattle) |
  (army.battle?.encircled === true ? BattleFlag.Encircled : 0) |
  (army.retreat === undefined ? 0 : BattleFlag.Retreating);

export interface SocketOptions {
  demo: boolean;
}

export const attachSockets = (
  server: Server,
  world: World,
  options: SocketOptions = { demo: false },
) => {
  const sessions = new Set<Session>();
  const sockets = new WebSocketServer({
    server,
    path: socketPath,
    maxPayload: world.config.network.maxMessageBytes,
  });

  const send = (session: Session, message: ServerMessage): void => {
    if (session.socket.readyState === WebSocket.OPEN) {
      session.socket.send(encodeServerMessage(message, world.config.world));
    }
  };

  const join = (session: Session, name: string, token: string): void => {
    const validName = validatePlayerName(name, world.config.lobby.playerName);
    if (validName === undefined) {
      send(session, {
        type: ServerMessageType.Rejected,
        reason: JoinRejection.InvalidName,
      });
      return;
    }
    const result = joinLobby(world, validName, token);
    if ("rejection" in result) {
      send(session, {
        type: ServerMessageType.Rejected,
        reason: result.rejection,
      });
      return;
    }
    session.army = result.army;
    session.deaths = result.army.deaths;
    send(session, {
      type: ServerMessageType.Welcome,
      mageId: result.army.mage.id,
      token: result.token,
    });
    send(session, {
      type: ServerMessageType.Config,
      config: toClientConfig(world.config),
    });
  };

  const searchProgress = (army: Army): number => {
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

  const crossStrengths = (army: Army) =>
    [...world.crosses].flatMap((cross) => {
      const strength = cross.strengths.get(army) ?? 0;
      return strength > 0 ? [{ id: cross.id, strength }] : [];
    });

  const sendLeaderboards = (): void => {
    const ranking = rankArmies(world);
    for (const session of sessions) {
      if (session.army !== undefined) {
        send(session, {
          type: ServerMessageType.Leaderboard,
          rank: ranking.ranks.get(session.army) ?? ranking.total,
          total: ranking.total,
          entries: ranking.entries,
        });
      }
    }
  };

  const sendEvents = (session: Session, army: Army): void => {
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
          souls: state.result?.rewards.get(army) ?? 0,
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
    if (session.army === undefined) {
      if (message.type !== ClientMessageType.Join) {
        throw new ProtocolError("Message before join");
      }
      join(session, message.name, message.token);
      return;
    }
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
      case ClientMessageType.Retreat:
        orderRetreat(world, session.army, message.x, message.y);
        break;
      case ClientMessageType.Evolve:
        orderEvolve(world, session.army, message.evolution);
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
      deaths: 0,
      view: { width: 0, height: 0 },
      bosses: new Map(),
      delta: new SnapshotDelta(),
    };
    sessions.add(session);
    socket.on("message", (data, isBinary) => {
      try {
        if (!isBinary) {
          throw new ProtocolError("Text message");
        }
        handle(session, decodeClientMessage(toBytes(data), world.config.world));
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
        leaveLobby(world, session.army);
      }
    });
  });

  let leaderboardAt = -Infinity;

  return {
    sessions,
    broadcastConfig: (): void => {
      for (const session of sessions) {
        if (session.army !== undefined) {
          send(session, {
            type: ServerMessageType.Config,
            config: toClientConfig(world.config),
          });
        }
      }
    },
    sendSnapshots: (): void => {
      if (world.time >= leaderboardAt) {
        leaderboardAt = world.time + world.config.lobby.leaderboard.intervalSec;
        sendLeaderboards();
      }
      for (const session of sessions) {
        if (session.army === undefined) {
          continue;
        }
        const { army } = session;
        if (army.deaths !== session.deaths) {
          session.deaths = army.deaths;
          send(session, {
            type: ServerMessageType.Died,
            killer: army.killerName,
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
          units: army.units.size,
          strength: armyStrength(world, army),
          battle: battleFlags(army),
          search: searchProgress(army),
          circles: aggroCircles(world, army),
          counts: [...evolvableCounts(world, army)].map(([type, count]) => ({
            type: world.registries.units.index(type),
            count,
          })),
          crosses: crossStrengths(army),
        });
        send(session, {
          type: ServerMessageType.Snapshot,
          tick: world.tick,
          ...session.delta.next(
            visibleEntities(world, army, session.view),
            world.config.world,
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
