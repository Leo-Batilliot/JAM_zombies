import {
  JoinRejection,
  ServerMessageType,
  ClientMessageType,
  decodeServerMessage,
  encodeClientMessage,
  socketPath,
  type ClientConfig,
  type Bounty,
  type ClientMessage,
  type LeaderboardEntry,
  type SnapshotEntity,
  type Status,
} from "@horde/shared";
import { SnapshotState } from "./snapshots.js";

export interface Snapshot {
  tick: number;
  entities: SnapshotEntity[];
}

export interface Leaderboard {
  rank: number;
  total: number;
  entries: LeaderboardEntry[];
  bounty: Bounty;
}

export interface EventStart {
  event: number;
  x: number;
  y: number;
}

export interface EventEnd {
  event: number;
  defeated: boolean;
  souls: number;
}

const tokenKey = "horde.reconnect";

const loadToken = (): string => {
  try {
    return localStorage.getItem(tokenKey) ?? "";
  } catch {
    return "";
  }
};

const saveToken = (token: string): void => {
  try {
    localStorage.setItem(tokenKey, token);
  } catch {
    return;
  }
};

export class JoinError extends Error {
  override name = "JoinError";

  constructor(readonly reason: JoinRejection | undefined) {
    super(reason === undefined ? "Connection lost" : "Join rejected");
  }
}

export class Connection {
  onSnapshot: (snapshot: Snapshot) => void = () => undefined;
  onDied: (killer: string) => void = () => undefined;
  onClose: () => void = () => undefined;

  onConfig: (config: ClientConfig) => void = () => undefined;
  onLeaderboard: (leaderboard: Leaderboard) => void = () => undefined;
  onStatus: (status: Status) => void = () => undefined;
  onEventStarted: (start: EventStart) => void = () => undefined;
  onEventEnded: (end: EventEnd) => void = () => undefined;
  onLoot: (item: number) => void = () => undefined;

  constructor(
    readonly socket: WebSocket,
    public config: ClientConfig,
    readonly mageId: number,
  ) {}

  send(message: ClientMessage): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(encodeClientMessage(message, this.config.world));
    }
  }
}

export const join = (name: string): Promise<Connection> =>
  new Promise((resolve, reject) => {
    const scheme = location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${scheme}://${location.host}${socketPath}`);
    socket.binaryType = "arraybuffer";
    let mageId: number | undefined;
    let connection: Connection | undefined;
    const snapshots = new SnapshotState();

    socket.addEventListener("open", () => {
      socket.send(
        encodeClientMessage(
          { type: ClientMessageType.Join, name, token: loadToken() },
          undefined,
        ),
      );
    });

    socket.addEventListener("message", (event: MessageEvent<ArrayBuffer>) => {
      const message = decodeServerMessage(event.data, connection?.config.world);
      switch (message.type) {
        case ServerMessageType.Welcome:
          mageId = message.mageId;
          saveToken(message.token);
          break;
        case ServerMessageType.Rejected:
          socket.close();
          reject(new JoinError(message.reason));
          break;
        case ServerMessageType.Config:
          if (connection !== undefined) {
            connection.config = message.config;
            connection.onConfig(message.config);
          } else if (mageId !== undefined) {
            connection = new Connection(socket, message.config, mageId);
            resolve(connection);
          }
          break;
        case ServerMessageType.Snapshot:
          connection?.onSnapshot({
            tick: message.tick,
            entities: snapshots.apply(message),
          });
          break;
        case ServerMessageType.Died:
          connection?.onDied(message.killer);
          break;
        case ServerMessageType.Leaderboard:
          connection?.onLeaderboard(message);
          break;
        case ServerMessageType.Status:
          connection?.onStatus(message);
          break;
        case ServerMessageType.EventStarted:
          connection?.onEventStarted(message);
          break;
        case ServerMessageType.EventEnded:
          connection?.onEventEnded(message);
          break;
        case ServerMessageType.Loot:
          connection?.onLoot(message.item);
          break;
      }
    });

    socket.addEventListener("close", () => {
      if (connection === undefined) {
        reject(new JoinError(undefined));
      } else {
        connection.onClose();
      }
    });
  });
