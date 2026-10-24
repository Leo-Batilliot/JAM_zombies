import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createStaticHandler } from "../../src/net/static.js";

let root: string;
let server: Server;
let base: string;

beforeAll(async () => {
  const parent = mkdtempSync(join(tmpdir(), "horde-static-"));
  root = join(parent, "dist");
  mkdirSync(join(root, "assets"), { recursive: true });
  writeFileSync(join(root, "index.html"), "<h1>home</h1>");
  writeFileSync(join(root, "share.html"), "<h1>share</h1>");
  writeFileSync(join(root, "assets", "app.js"), "export {};");
  writeFileSync(join(parent, "secret.txt"), "secret");
  const serve = createStaticHandler(root);
  server = createServer((request, response) => {
    void serve(request, response);
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://localhost:${String((server.address() as AddressInfo).port)}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  rmSync(join(root, ".."), { recursive: true });
});

describe("static files", () => {
  test("serves index.html at the root", async () => {
    const response = await fetch(`${base}/`);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toBe("<h1>home</h1>");
  });

  test("serves a page without its extension", async () => {
    expect(await (await fetch(`${base}/share`)).text()).toBe("<h1>share</h1>");
  });

  test("serves assets with their type", async () => {
    const response = await fetch(`${base}/assets/app.js`);
    expect(response.headers.get("content-type")).toContain("text/javascript");
  });

  test("returns 404 for a missing file", async () => {
    expect((await fetch(`${base}/missing.js`)).status).toBe(404);
  });

  test("refuses to leave the client folder", async () => {
    expect((await fetch(`${base}/..%2Fsecret.txt`)).status).toBe(404);
  });

  test("refuses other methods", async () => {
    expect((await fetch(`${base}/`, { method: "POST" })).status).toBe(405);
  });
});
