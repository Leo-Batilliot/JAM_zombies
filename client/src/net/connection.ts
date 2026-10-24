import {
  JoinRejection,
  ServerMessageType,
  ClientMessageType,
  decodeServerMessage,
  encodeClientMessage,
  socketPath,
  type ClientConfig,
  type ClientMessage,
  type LeaderboardEntry,
  type SnapshotEntity,
} from "@horde/shared";

export interface Snapshot {
  tick: number;
  entities: SnapshotEntity[];
}

export interface Leaderboard {
  rank: number;
  total: number;
  entries: LeaderboardEntry[];
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
          connection?.onSnapshot(message);
          break;
        case ServerMessageType.Died:
          connection?.onDied(message.killer);
          break;
        case ServerMessageType.Leaderboard:
          connection?.onLeaderboard(message);
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
