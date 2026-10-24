import {
  JoinRejection,
  ServerMessageType,
  ClientMessageType,
  decodeServerMessage,
  encodeClientMessage,
  socketPath,
  type ClientConfig,
  type ClientMessage,
  type SnapshotEntity,
} from "@horde/shared";

export interface Snapshot {
  tick: number;
  entities: SnapshotEntity[];
}

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

  constructor(
    readonly socket: WebSocket,
    readonly config: ClientConfig,
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
        encodeClientMessage({ type: ClientMessageType.Join, name }, undefined),
      );
    });

    socket.addEventListener("message", (event: MessageEvent<ArrayBuffer>) => {
      const message = decodeServerMessage(event.data, connection?.config.world);
      switch (message.type) {
        case ServerMessageType.Welcome:
          mageId = message.mageId;
          break;
        case ServerMessageType.Rejected:
          socket.close();
          reject(new JoinError(message.reason));
          break;
        case ServerMessageType.Config:
          if (mageId !== undefined && connection === undefined) {
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
