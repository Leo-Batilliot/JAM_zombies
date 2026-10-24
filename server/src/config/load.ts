import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { configSchema, type Config, type ConfigFile } from "@horde/shared";

export class ConfigError extends Error {
  override name = "ConfigError";
}

export const parseConfigFile = <F extends ConfigFile>(
  dir: string,
  file: F,
): Config[F] => {
  const path = join(dir, `${file}.json`);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`Cannot read config file ${path}: ${reason}`);
  }
  const result = configSchema.shape[file].safeParse(raw);
  if (!result.success) {
    throw new ConfigError(
      `Invalid config file ${path}:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data as Config[F];
};

export const loadConfig = (dir: string): Config => {
  const files = Object.keys(configSchema.shape) as ConfigFile[];
  return Object.fromEntries(
    files.map((file) => [file, parseConfigFile(dir, file)]),
  ) as Config;
};
