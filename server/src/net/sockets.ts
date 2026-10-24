import type { Server } from "node:http";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import {
  ClientMessageType,
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
import { orderAttack, orderMove } from "../systems/orders.js";
import { maxHp } from "../systems/souls.js";
import { armyStrength } from "../systems/strength.js";
import type { Army, World } from "../world/world.js";
import { visibleEntities, type View } from "./interest.js";

const protocolErrorCode = 1008;

interface Session {
  socket: WebSocket;
  army?: Army;
  deaths: number;
  view: View;
}

const toBytes = (data: RawData): Uint8Array =>
  Array.isArray(data)
    ? Buffer.concat(data)
    : data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : data;

export const attachSockets = (server: Server, world: World) => {
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
      default:
        break;
    }
  };

  sockets.on("connection", (socket) => {
    const session: Session = {
      socket,
      deaths: 0,
      view: { width: 0, height: 0 },
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
        send(session, {
          type: ServerMessageType.Status,
          army: army.slot,
          hp: army.alive ? army.mage.hp : 0,
          maxHp: maxHp(world, army),
          level: army.level,
          souls: army.souls,
          units: army.units.size,
          strength: armyStrength(world, army),
        });
        send(session, {
          type: ServerMessageType.Snapshot,
          tick: world.tick,
          entities: visibleEntities(world, army, session.view),
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
