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

const unit = (
  strength: number,
  evolutions: { into: string; cost: number }[] = [],
) => ({
  strength,
  rank: "front" as const,
  speed: 1,
  radius: 0.5,
  hp: 10,
  damage: 1,
  attackIntervalSec: 1,
  attackRange: 0.3,
  aggroRange: 5,
  evolutions,
});

const npc = (corpse: string) => ({
  corpse,
  infects: true,
  strength: 1,
  hp: 5,
  radius: 0.4,
  speed: 1,
  fleeSpeed: 2,
});

const withUnits = (units: Config["units"]): Config => {
  const config = loadSharedConfig();
  return { ...config, units, world: { ...config.world, populations: [] } };
};

describe("buildRegistries", () => {
  test("builds a registry for each content type", () => {
    const registries = buildRegistries(
      withUnits({
        units: {
          zombie: unit(1, [{ into: "fat", cost: 5 }]),
          fat: unit(5),
        },
        npcs: { civilian: npc("zombie") },
      }),
    );
    expect(registries.units.get("fat").strength).toBe(5);
    expect(registries.npcs.ids()).toEqual(["civilian"]);
  });

  test("gives each id its position", () => {
    const registries = buildRegistries(
      withUnits({ units: { zombie: unit(1), fat: unit(5) }, npcs: {} }),
    );
    expect(registries.units.index("zombie")).toBe(0);
    expect(registries.units.index("fat")).toBe(1);
    expect(() => registries.units.index("ghost")).toThrow(RegistryError);
  });

  test("fails on a starting army with a missing unit", () => {
    expect(() =>
      buildRegistries(withUnits({ units: { fat: unit(5) }, npcs: {} })),
    ).toThrow(/Starting army[\s\S]*zombie/);
  });

  test("fails on a population of a missing npc", () => {
    const config = loadSharedConfig();
    expect(() =>
      buildRegistries({ ...config, units: { ...config.units, npcs: {} } }),
    ).toThrow(/Population[\s\S]*civilian/);
  });

  test("fails on an unknown mass grave", () => {
    const config = loadSharedConfig();
    expect(() =>
      buildRegistries({
        ...config,
        world: { ...config.world, massGrave: "ghost" },
      }),
    ).toThrow(/Mass grave[\s\S]*ghost/);
  });

  test("fails when the mage respawns before the end of the screamer", () => {
    const config = loadSharedConfig();
    config.gameplay.respawn.delaySec = 0.5;
    expect(() => buildRegistries(config)).toThrow(/screamer/);
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
            zombie: unit(1, [{ into: "golem", cost: 10 }]),
          },
          npcs: {},
        }),
      ),
    ).toThrow(RegistryError);
  });

  test("fails on a corpse of a missing unit", () => {
    expect(() =>
      buildRegistries(
        withUnits({ units: {}, npcs: { civilian: npc("zombie") } }),
      ),
    ).toThrow(/civilian[\s\S]*zombie/);
  });
});
