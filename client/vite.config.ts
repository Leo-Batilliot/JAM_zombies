import { defineConfig, loadEnv } from "vite";
import { socketPath } from "@horde/shared";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");
  return {
    server: {
      host: true,
      proxy: {
        [socketPath]: {
          target: `ws://localhost:${env["PORT"] ?? ""}`,
          ws: true,
        },
      },
    },
    build: {
      rolldownOptions: {
        input: { main: "index.html", share: "share.html" },
      },
    },
  };
});
