import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { buildRegistries } from "@horde/shared";
import { loadConfig } from "../../src/config/load.js";
import { reloadConfigFile, watchConfig } from "../../src/config/watch.js";
import { copyConfigDir, type ConfigDir } from "../support/config-dir.js";

let dir: ConfigDir;

beforeEach(() => {
  dir = copyConfigDir();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  dir.remove();
});

const options = (onReload = vi.fn()) => ({
  validate: buildRegistries,
  onReload,
});

describe("reloadConfigFile", () => {
  test("replaces the values in the config object", () => {
    const config = loadConfig(dir.path);
    const onReload = vi.fn();
    dir.write("gameplay", '{ "mage": { "speed": 42 } }');
    reloadConfigFile(dir.path, config, "gameplay", options(onReload));
    expect(config.gameplay.mage.speed).toBe(42);
    expect(onReload).toHaveBeenCalledWith("gameplay");
  });

  test("keeps the previous file when the new one is invalid", () => {
    const config = loadConfig(dir.path);
    const previous = config.gameplay;
    const onReload = vi.fn();
    dir.write("gameplay", '{ "mage": { "speed": -1 } }');
    reloadConfigFile(dir.path, config, "gameplay", options(onReload));
    expect(config.gameplay).toBe(previous);
    expect(onReload).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  test("keeps the previous file when a reference is unknown", () => {
    const config = loadConfig(dir.path);
    dir.write(
      "units",
      '{ "units": {}, "npcs": { "civilian": { "corpse": "zombie" } } }',
    );
    reloadConfigFile(dir.path, config, "units", options());
    expect(config.units.npcs).toEqual({});
  });

  test("keeps structural values and warns", () => {
    const config = loadConfig(dir.path);
    const tickRate = config.network.tickRate;
    dir.write(
      "network",
      JSON.stringify({
        ...config.network,
        tickRate: tickRate + 1,
        interestMargin: 99,
      }),
    );
    reloadConfigFile(dir.path, config, "network", options());
    expect(config.network.tickRate).toBe(tickRate);
    expect(config.network.interestMargin).toBe(99);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("tickRate"),
    );
  });
});

describe("watchConfig", () => {
  test("reloads a file after it is saved", async () => {
    const config = loadConfig(dir.path);
    const stop = watchConfig(dir.path, config, { delayMs: 20, ...options() });
    dir.write("gameplay", '{ "mage": { "speed": 13 } }');
    await vi.waitFor(() => {
      expect(config.gameplay.mage.speed).toBe(13);
    });
    stop();
  });
});
