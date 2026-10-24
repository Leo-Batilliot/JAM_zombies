import { join } from "node:path";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { configSchema, type Config } from "../src/config/schema.js";
import { RegistryError, buildRegistries } from "../src/registry.js";

const configDir = join(import.meta.dirname, "../config");

const loadSharedConfig = (): Config =>
  configSchema.parse(
    Object.fromEntries(
      readdirSync(configDir).map((file) => [
        file.replace(/\.json$/, ""),
        JSON.parse(readFileSync(join(configDir, file), "utf8")) as unknown,
      ]),
    ),
  );

const withUnits = (units: Config["units"]): Config => ({
  ...loadSharedConfig(),
  units,
});

describe("buildRegistries", () => {
  test("builds a registry for each content type", () => {
    const registries = buildRegistries(
      withUnits({
        units: {
          zombie: { strength: 1, evolutions: [{ into: "fat", cost: 5 }] },
          fat: { strength: 5, evolutions: [] },
        },
        npcs: { civilian: { corpse: "zombie" } },
      }),
    );
    expect(registries.units.get("fat").strength).toBe(5);
    expect(registries.npcs.ids()).toEqual(["civilian"]);
  });

  test("fails on an unknown id", () => {
    const registries = buildRegistries(loadSharedConfig());
    expect(() => registries.units.get("ghost")).toThrow(/unit "ghost"/);
  });

  test("fails on an evolution toward a missing unit", () => {
    expect(() =>
      buildRegistries(
        withUnits({
          units: {
            zombie: { strength: 1, evolutions: [{ into: "golem", cost: 10 }] },
          },
          npcs: {},
        }),
      ),
    ).toThrow(RegistryError);
  });

  test("fails on a corpse of a missing unit", () => {
    expect(() =>
      buildRegistries(
        withUnits({ units: {}, npcs: { civilian: { corpse: "zombie" } } }),
      ),
    ).toThrow(/civilian[\s\S]*zombie/);
  });
});
