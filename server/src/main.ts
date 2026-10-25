import { createServer } from "node:http";
import { buildRegistries } from "@horde/shared";
import { loadConfig } from "./config/load.js";
import { watchConfig } from "./config/watch.js";
import { loadEnv } from "./env.js";
import { Lobbies } from "./lobby/lobbies.js";
import { attachSockets } from "./net/sockets.js";
import { createStaticHandler } from "./net/static.js";
import { startLoop } from "./world/loop.js";
import { World } from "./world/world.js";

const env = loadEnv();
const config = loadConfig(env.CONFIG_DIR);
const registries = buildRegistries(config);

const lobbies = new Lobbies(
  config,
  () => new World(config, registries),
  (world, afterTick) => startLoop(world, afterTick).stop,
);
const serveStatic = createStaticHandler(env.CLIENT_DIR);
const server = createServer((request, response) => {
  void serveStatic(request, response);
});
const sockets = attachSockets(server, lobbies, { demo: env.DEMO_MODE });
lobbies.onTick = sockets.sendSnapshots;

watchConfig(env.CONFIG_DIR, config, {
  delayMs: env.CONFIG_RELOAD_DELAY_MS,
  validate: buildRegistries,
  onReload: () => {
    Object.assign(registries, buildRegistries(config));
    sockets.broadcastConfig();
  },
});

server.listen(env.PORT, () => {
  console.info(
    `Server listening on port ${String(env.PORT)}${env.DEMO_MODE ? " (demo mode)" : ""}`,
  );
});
