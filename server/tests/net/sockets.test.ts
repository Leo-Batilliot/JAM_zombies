import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { WebSocket } from "ws";
import {
  ClientMessageType,
  JoinRejection,
  ServerMessageType,
  decodeServerMessage,
  encodeClientMessage,
  socketPath,
  type ClientMessage,
  type ServerMessage,
} from "@horde/shared";
import { attachSockets } from "../../src/net/sockets.js";
import { createBench, type Bench } from "../support/bench.js";

let bench: Bench;
let server: Server;
let sockets: ReturnType<typeof attachSockets>;
let url: string;

beforeEach(async () => {
  bench = createBench();
  server = createServer();
  sockets = attachSockets(server, bench.world);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `ws://localhost:${String((server.address() as AddressInfo).port)}${socketPath}`;
});

afterEach(async () => {
  await sockets.close();
  await new Promise((resolve) => server.close(resolve));
});

const connect = async () => {
  const socket = new WebSocket(url);
  const received: ServerMessage[] = [];
  socket.on("message", (data: Buffer) => {
    received.push(decodeServerMessage(data, bench.config.world));
  });
  await new Promise((resolve) => socket.once("open", resolve));
  return {
    socket,
    received,
    send: (message: ClientMessage) => {
      socket.send(encodeClientMessage(message, bench.config.world));
    },
  };
};

describe("sockets", () => {
  test("a player joins and receives the welcome and the config", async () => {
    const client = await connect();
    client.send({ type: ClientMessageType.Join, name: "Ash" });
    await vi.waitFor(() => {
      expect(client.received.map((message) => message.type)).toEqual([
        ServerMessageType.Welcome,
        ServerMessageType.Config,
      ]);
    });
    expect(bench.world.entities.size).toBe(1);
    client.socket.close();
  });

  test("an invalid name is rejected", async () => {
    const client = await connect();
    client.send({ type: ClientMessageType.Join, name: "<script>" });
    await vi.waitFor(() => {
      expect(client.received).toEqual([
        { type: ServerMessageType.Rejected, reason: JoinRejection.InvalidName },
      ]);
    });
    expect(bench.world.entities.size).toBe(0);
    client.socket.close();
  });

  test("a message before joining closes the connection", async () => {
    const client = await connect();
    client.send({ type: ClientMessageType.Move, x: 1, y: 1 });
    const code = await new Promise((resolve) =>
      client.socket.once("close", resolve),
    );
    expect(code).toBe(1008);
  });

  test("the player moves its mage and receives snapshots", async () => {
    const client = await connect();
    client.send({ type: ClientMessageType.Join, name: "Ash" });
    client.send({ type: ClientMessageType.View, width: 80, height: 45 });
    await vi.waitFor(() => {
      expect(client.received).toHaveLength(2);
    });
    const welcome = client.received[0];
    if (welcome?.type !== ServerMessageType.Welcome) {
      throw new Error("Expected a welcome message");
    }
    const mage = bench.world.entities.get(welcome.mageId);
    client.send({ type: ClientMessageType.Move, x: 0, y: 0 });
    await vi.waitFor(() => {
      expect(mage?.targetX).toBe(0);
    });
    bench.step();
    sockets.sendSnapshots();
    await vi.waitFor(() => {
      const snapshot = client.received[2];
      expect(snapshot?.type).toBe(ServerMessageType.Snapshot);
      if (snapshot?.type === ServerMessageType.Snapshot) {
        expect(snapshot.entities.map((entity) => entity.id)).toEqual([
          welcome.mageId,
        ]);
      }
    });
    client.socket.close();
  });

  test("the mage is removed when the player disconnects", async () => {
    const client = await connect();
    client.send({ type: ClientMessageType.Join, name: "Ash" });
    await vi.waitFor(() => {
      expect(bench.world.entities.size).toBe(1);
    });
    client.socket.close();
    await vi.waitFor(() => {
      expect(bench.world.entities.size).toBe(0);
    });
  });
});
