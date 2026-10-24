import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sharedConfigDir } from "./bench.js";

export interface ConfigDir {
  path: string;
  write: (file: string, content: string) => void;
  remove: () => void;
}

export const copyConfigDir = (): ConfigDir => {
  const path = mkdtempSync(join(tmpdir(), "horde-config-"));
  cpSync(sharedConfigDir, path, { recursive: true });
  return {
    path,
    write: (file, content) => {
      writeFileSync(join(path, `${file}.json`), content);
    },
    remove: () => {
      rmSync(path, { recursive: true });
    },
  };
};
