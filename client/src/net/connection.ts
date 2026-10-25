import {
  JoinRejection,
  ServerMessageType,
  ClientMessageType,
  decodeServerMessage,
  encodeClientMessage,
  socketPath,
  spectatorMageId,
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

export interface Focus {
  army: number;
  mageId: number;
  name: string;
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
  onFocus: (focus: Focus) => void = () => undefined;
  focus: Focus | undefined;

  constructor(
    readonly socket: WebSocket,
    public config: ClientConfig,
    readonly mageId: number,
  ) {}

  get spectating(): boolean {
    return this.mageId === spectatorMageId;
  }

  send(message: ClientMessage): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(encodeClientMessage(message, this.config.world));
    }
  }
}

interface Request {
  resolve: (connection: Connection) => void;
  reject: (error: JoinError) => void;
}

export class Gate {
  #request: Request | undefined;

  constructor(
    readonly socket: WebSocket,
    public config: ClientConfig,
  ) {}

  get open(): boolean {
    return this.socket.readyState === WebSocket.OPEN;
  }

  join(name: string, skin: number): Promise<Connection> {
    return this.#ask({
      type: ClientMessageType.Join,
      name,
      token: loadToken(),
      skin,
    });
  }

  watch(): Promise<Connection> {
    return this.#ask({ type: ClientMessageType.Spectate });
  }

  #ask(message: ClientMessage): Promise<Connection> {
    return new Promise((resolve, reject) => {
      if (!this.open || this.#request !== undefined) {
        reject(new JoinError(undefined));
        return;
      }
      this.#request = { resolve, reject };
      this.socket.send(encodeClientMessage(message, this.config.world));
    });
  }

  settle(outcome: Connection | JoinError): void {
    const request = this.#request;
    this.#request = undefined;
    if (outcome instanceof JoinError) {
      request?.reject(outcome);
    } else {
      request?.resolve(outcome);
    }
  }
}

export const connect = (): Promise<Gate> =>
  new Promise((resolve, reject) => {
    const scheme = location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${scheme}://${location.host}${socketPath}`);
    socket.binaryType = "arraybuffer";
    let gate: Gate | undefined;
    let connection: Connection | undefined;
    const snapshots = new SnapshotState();

    socket.addEventListener("message", (event: MessageEvent<ArrayBuffer>) => {
      const message = decodeServerMessage(event.data, gate?.config.world);
      switch (message.type) {
        case ServerMessageType.Config:
          if (gate === undefined) {
            gate = new Gate(socket, message.config);
            resolve(gate);
          } else {
            gate.config = message.config;
          }
          if (connection !== undefined) {
            connection.config = message.config;
            connection.onConfig(message.config);
          }
          break;
        case ServerMessageType.Welcome:
          if (gate !== undefined) {
            connection = new Connection(socket, gate.config, message.mageId);
            if (!connection.spectating) {
              saveToken(message.token);
            }
            gate.settle(connection);
          }
          break;
        case ServerMessageType.Rejected:
          gate?.settle(new JoinError(message.reason));
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
        case ServerMessageType.Focus:
          if (connection !== undefined) {
            connection.focus = message;
            connection.onFocus(message);
          }
          break;
      }
    });

    socket.addEventListener("close", () => {
      if (connection !== undefined) {
        connection.onClose();
        return;
      }
      gate?.settle(new JoinError(undefined));
      reject(new JoinError(undefined));
    });
  });
