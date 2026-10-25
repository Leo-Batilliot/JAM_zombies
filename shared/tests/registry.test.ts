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
  name: "Unit",
  family: "zombie",
  bonus: {},
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
  name: "Civilian",
  corpse,
  infects: true,
  strength: 1,
  hp: 5,
  radius: 0.4,
  speed: 1,
  fleeSpeed: 2,
});

const withUnits = (units: Pick<Config["units"], "units" | "npcs">): Config => {
  const config = loadSharedConfig();
  const eventNpcs = Object.fromEntries(
    Object.entries(config.units.npcs).filter(
      ([, npc]) => npc.attack !== undefined && npc.corpse === undefined,
    ),
  );
  return {
    ...config,
    units: {
      units: units.units,
      npcs: { ...eventNpcs, ...units.npcs },
      projectiles: config.units.projectiles,
    },
    world: {
      ...config.world,
      populations: [],
      pointsOfInterest: Object.fromEntries(
        Object.entries(config.world.pointsOfInterest).filter(
          ([, point]) => point.reward !== "units",
        ),
      ),
      camps: {
        ...config.world.camps,
        defenders: [{ npc: "jack-o-lantern", count: 1 }],
      },
    },
  };
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
    expect(registries.npcs.ids()).toContain("civilian");
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

  test("fails on a population that cannot flee", () => {
    const config = loadSharedConfig();
    delete config.units.npcs["civilian"]?.fleeSpeed;
    expect(() => buildRegistries(config)).toThrow(/fleeSpeed/);
  });

  test("fails on an event with a missing boss", () => {
    const config = loadSharedConfig();
    for (const event of Object.values(config.events.events)) {
      event.boss = "ghost";
    }
    expect(() => buildRegistries(config)).toThrow(/Boss of event[\s\S]*ghost/);
  });

  test("accepts an npc without corpse", () => {
    const config = loadSharedConfig();
    expect(config.units.npcs["evil-pumpkin"]?.corpse).toBeUndefined();
    expect(() => buildRegistries(config)).not.toThrow();
  });

  test("fails on a demo with an unknown event", () => {
    const config = loadSharedConfig();
    config.gameplay.demo.event = "ghost";
    expect(() => buildRegistries(config)).toThrow(/Demo[\s\S]*ghost/);
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

describe("equipment references", () => {
  test("fails on a loot table with an unknown item", () => {
    const config = loadSharedConfig();
    const car = config.world.pointsOfInterest["car"];
    if (car !== undefined) {
      car.loot = [{ item: "laser", weight: 1 }];
    }
    expect(() => buildRegistries(config)).toThrow(/car[\s\S]*laser/);
  });

  test("fails on an item reward without loot", () => {
    const config = loadSharedConfig();
    delete config.world.pointsOfInterest["car"]?.loot;
    expect(() => buildRegistries(config)).toThrow(/"car" has no loot/);
  });

  test("fails on an unknown legendary boss reward", () => {
    const config = loadSharedConfig();
    const pumpkin = config.events.events["pumpkin"];
    if (pumpkin !== undefined) {
      pumpkin.rewardLegendary = "laser";
    }
    expect(() => buildRegistries(config)).toThrow(/pumpkin[\s\S]*laser/);
  });

  test("fails when a category has more items than the snapshot can tell", () => {
    const config = loadSharedConfig();
    for (let index = 0; index < 8; index++) {
      config.equipment.items[`spoon-${String(index)}`] = {
        name: "Spoon",
        category: "melee",
        rarity: "common",
        damage: 1,
      };
    }
    expect(() => buildRegistries(config)).toThrow(/Category "melee"/);
  });

  test("an item rarity must be listed", () => {
    const raw = loadSharedConfig();
    const result = configSchema.safeParse({
      ...raw,
      equipment: {
        ...raw.equipment,
        items: {
          spoon: {
            name: "Spoon",
            category: "melee",
            rarity: "epic",
            damage: 1,
          },
        },
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("phase 6 references", () => {
  test("fails on a unit with an unknown projectile", () => {
    const config = loadSharedConfig();
    const archer = config.units.units["skeleton-archer"];
    if (archer !== undefined) {
      archer.projectile = "laser";
    }
    expect(() => buildRegistries(config)).toThrow(
      /skeleton-archer[\s\S]*laser/,
    );
  });

  test("fails on a units reward without units", () => {
    const config = loadSharedConfig();
    const graveyard = config.world.pointsOfInterest["graveyard"];
    if (graveyard !== undefined) {
      delete graveyard.units;
    }
    expect(() => buildRegistries(config)).toThrow(/graveyard/);
  });

  test("fails on a camp defender that cannot attack", () => {
    const config = loadSharedConfig();
    config.world.camps.defenders = [{ npc: "civilian", count: 2 }];
    expect(() => buildRegistries(config)).toThrow(/civilian/);
  });

  test("fails on bots using an unknown formation", () => {
    const config = loadSharedConfig();
    config.lobby.bots.formations.attack = "turtle";
    expect(() => buildRegistries(config)).toThrow(/turtle/);
  });

  test("fails on bots using an inherited object key as formation", () => {
    const config = loadSharedConfig();
    config.lobby.bots.formations.defend = "toString";
    expect(() => buildRegistries(config)).toThrow(/toString/);
  });
});
