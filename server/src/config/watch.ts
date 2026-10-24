import { watch } from "node:fs";
import {
  configSchema,
  structuralPaths,
  type Config,
  type ConfigFile,
} from "@horde/shared";
import { parseConfigFile } from "./load.js";

export interface WatchOptions {
  delayMs: number;
  validate: (candidate: Config) => void;
  onReload: (file: ConfigFile) => void;
}

const isConfigFile = (name: string): name is ConfigFile =>
  Object.hasOwn(configSchema.shape, name);

const readPath = (value: unknown, path: string[]): unknown =>
  path.reduce<unknown>(
    (current, key) => (current as Record<string, unknown>)[key],
    value,
  );

const writePath = (value: unknown, path: string[], next: unknown): void => {
  const parent = readPath(value, path.slice(0, -1)) as Record<string, unknown>;
  parent[path.at(-1) as string] = next;
};

const keepStructuralValues = (
  file: ConfigFile,
  previous: unknown,
  next: unknown,
): void => {
  for (const path of structuralPaths(configSchema.shape[file])) {
    const before = readPath(previous, path);
    if (before !== readPath(next, path)) {
      console.warn(
        `${file}.json: ${path.join(".")} changed, restart the server to apply it`,
      );
      writePath(next, path, before);
    }
  }
};

export const reloadConfigFile = (
  dir: string,
  config: Config,
  file: ConfigFile,
  options: Pick<WatchOptions, "validate" | "onReload">,
): void => {
  try {
    const next = parseConfigFile(dir, file);
    keepStructuralValues(file, config[file], next);
    options.validate({ ...config, [file]: next });
    Object.assign(config, { [file]: next });
    options.onReload(file);
    console.info(`Config reloaded: ${file}.json`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(
      `Config reload failed, keeping previous ${file}.json\n${reason}`,
    );
  }
};

export const watchConfig = (
  dir: string,
  config: Config,
  options: WatchOptions,
): (() => void) => {
  const timers = new Map<ConfigFile, NodeJS.Timeout>();
  const watcher = watch(dir, (_event, filename) => {
    const file = filename?.replace(/\.json$/, "");
    if (
      file === undefined ||
      !filename?.endsWith(".json") ||
      !isConfigFile(file)
    ) {
      return;
    }
    clearTimeout(timers.get(file));
    timers.set(
      file,
      setTimeout(() => {
        timers.delete(file);
        reloadConfigFile(dir, config, file, options);
      }, options.delayMs),
    );
  });
  return () => {
    watcher.close();
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
  };
};
