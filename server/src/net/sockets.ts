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
import { spawnArmy } from "../systems/army.js";
import { setMageTarget } from "../systems/movement.js";
import type { Army, World } from "../world/world.js";
import { visibleEntities, type View } from "./interest.js";

const protocolErrorCode = 1008;

interface Session {
  socket: WebSocket;
  army?: Army;
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

  const join = (session: Session, name: string): void => {
    const validName = validatePlayerName(name, world.config.lobby.playerName);
    if (validName === undefined) {
      send(session, {
        type: ServerMessageType.Rejected,
        reason: JoinRejection.InvalidName,
      });
      return;
    }
    session.army = spawnArmy(world, validName);
    send(session, {
      type: ServerMessageType.Welcome,
      mageId: session.army.mage.id,
    });
    send(session, {
      type: ServerMessageType.Config,
      config: toClientConfig(world.config),
    });
  };

  const handle = (session: Session, message: ClientMessage): void => {
    if (session.army === undefined) {
      if (message.type !== ClientMessageType.Join) {
        throw new ProtocolError("Message before join");
      }
      join(session, message.name);
      return;
    }
    switch (message.type) {
      case ClientMessageType.View:
        session.view = { width: message.width, height: message.height };
        break;
      case ClientMessageType.Move:
        setMageTarget(world, session.army.mage, message.x, message.y);
        break;
      default:
        break;
    }
  };

  sockets.on("connection", (socket) => {
    const session: Session = { socket, view: { width: 0, height: 0 } };
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
        world.removeArmy(session.army);
      }
    });
  });

  return {
    sessions,
    sendSnapshots: (): void => {
      for (const session of sessions) {
        if (session.army === undefined) {
          continue;
        }
        const { mage } = session.army;
        send(session, {
          type: ServerMessageType.Snapshot,
          tick: world.tick,
          entities: visibleEntities(world, mage.x, mage.y, session.view),
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
