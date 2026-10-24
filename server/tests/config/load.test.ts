import { rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { configSchema } from "@horde/shared";
import { ConfigError, loadConfig } from "../../src/config/load.js";
import { sharedConfigDir } from "../support/bench.js";
import { copyConfigDir, type ConfigDir } from "../support/config-dir.js";

let dir: ConfigDir;

beforeEach(() => {
  dir = copyConfigDir();
});

afterEach(() => {
  dir.remove();
});

describe("loadConfig", () => {
  test("loads every shared config file", () => {
    const config = loadConfig(sharedConfigDir);
    expect(Object.keys(config).sort()).toEqual(
      Object.keys(configSchema.shape).sort(),
    );
  });

  test("returns validated values", () => {
    dir.write(
      "client",
      '{ "maxPixelRatio": 1.5, "pixelsPerMeter": 20, "markerDurationMs": 300 }',
    );
    expect(loadConfig(dir.path).client.maxPixelRatio).toBe(1.5);
  });

  test("fails on a missing file", () => {
    rmSync(join(dir.path, "units.json"));
    expect(() => loadConfig(dir.path)).toThrow(/units\.json/);
  });

  test("fails on malformed JSON", () => {
    dir.write("client", "{ maxPixelRatio: ");
    expect(() => loadConfig(dir.path)).toThrow(ConfigError);
  });

  test("fails on a wrong type with the file and key", () => {
    dir.write("gameplay", '{ "mage": { "speed": "fast" } }');
    expect(() => loadConfig(dir.path)).toThrow(/gameplay\.json[\s\S]*speed/);
  });

  test("fails on an unknown key", () => {
    dir.write("events", '{ "events": {}, "evnets": {} }');
    expect(() => loadConfig(dir.path)).toThrow(/events\.json[\s\S]*evnets/);
  });
});
