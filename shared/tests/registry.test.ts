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

const unit = (strength: number) => ({
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
  obstacle: false,
});

const zombieLineage = (
  units: Config["units"]["units"],
): Config["units"]["lineages"] =>
  units["zombie"] === undefined
    ? {}
    : {
        zombie: {
          name: "Zombies",
          base: "zombie",
          branches: {
            test: {
              name: "Test",
              tiers: Object.keys(units).filter((id) => id !== "zombie"),
            },
          },
        },
      };

const withUnits = (
  units: Pick<Config["units"], "units" | "npcs">,
  lineages: Config["units"]["lineages"] = zombieLineage(units.units),
): Config => {
  const config = loadSharedConfig();
  const keptNpcs = Object.fromEntries(
    Object.entries(config.units.npcs).filter(
      ([, npc]) =>
        npc.obstacle || (npc.attack !== undefined && npc.corpse === undefined),
    ),
  );
  return {
    ...config,
    units: {
      units: units.units,
      npcs: { ...keptNpcs, ...units.npcs },
      projectiles: config.units.projectiles,
      fusionRatio: config.units.fusionRatio,
      lineages,
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
      places: {},
    },
  };
};

describe("buildRegistries", () => {
  test("builds a registry for each content type", () => {
    const registries = buildRegistries(
      withUnits({
        units: { zombie: unit(1), fat: unit(2) },
        npcs: { civilian: npc("zombie") },
      }),
    );
    expect(registries.units.get("fat").strength).toBe(2);
    expect(registries.tree.get("fat")).toEqual({
      lineage: "zombie",
      branch: "test",
      tier: 1,
    });
    expect(registries.npcs.ids()).toContain("civilian");
  });

  test("gives each id its position", () => {
    const registries = buildRegistries(
      withUnits({ units: { zombie: unit(1), fat: unit(2) }, npcs: {} }),
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

  test("fails on a lineage toward a missing unit", () => {
    expect(() =>
      buildRegistries(
        withUnits(
          { units: { zombie: unit(1) }, npcs: {} },
          {
            zombie: {
              name: "Zombies",
              base: "zombie",
              branches: { test: { name: "Test", tiers: ["golem"] } },
            },
          },
        ),
      ),
    ).toThrow(/golem/);
  });

  test("fails on a unit outside every lineage", () => {
    expect(() =>
      buildRegistries(
        withUnits(
          { units: { zombie: unit(1), fat: unit(2) }, npcs: {} },
          { zombie: { name: "Zombies", base: "zombie", branches: {} } },
        ),
      ),
    ).toThrow(/fat/);
  });

  test("fails on a tier whose strength does not follow the fusion ratio", () => {
    expect(() =>
      buildRegistries(
        withUnits({ units: { zombie: unit(1), fat: unit(5) }, npcs: {} }),
      ),
    ).toThrow(/strength of 2/);
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

  test("lists the mage skins in their order", () => {
    const registries = buildRegistries(loadSharedConfig());
    expect(registries.skins.index("necromancer")).toBe(0);
    expect(registries.skins.ids().length).toBeGreaterThan(1);
  });

  test("guard dogs leave a corpse of the beast lineage", () => {
    const registries = buildRegistries(loadSharedConfig());
    const corpse = registries.npcs.get("guard-dog").corpse ?? "";
    expect(registries.units.get(corpse).family).toBe("beast");
    expect(registries.units.get(corpse).equipment).toBe("collar");
  });
});

describe("config schema of the bonus content", () => {
  test("refuses a config without mage skins", () => {
    const raw = loadSharedConfig();
    raw.gameplay.mage.skins = {};
    expect(configSchema.safeParse(raw).success).toBe(false);
  });

  test("refuses bombings whose interval is reversed", () => {
    const raw = loadSharedConfig();
    raw.world.bombings.intervalSec = { min: 10, max: 5 };
    expect(configSchema.safeParse(raw).success).toBe(false);
  });
});

describe("places", () => {
  const withPlace = (
    edit: (config: Config) => void = () => undefined,
  ): Config => {
    const config = loadSharedConfig();
    edit(config);
    return config;
  };

  test("accept the shared config", () => {
    expect(() => buildRegistries(withPlace())).not.toThrow();
  });

  test("need their district in every city", () => {
    const config = withPlace((edited) => {
      const houses = edited.world.city.templates["houses"];
      const barracks = edited.world.places["barracks"];
      if (houses !== undefined && barracks !== undefined) {
        barracks.district = "houses";
        houses.min = 0;
      }
    });
    expect(() => buildRegistries(config)).toThrow(/in every city/);
  });

  test("fire their mortar from one of their defenders", () => {
    const config = withPlace((edited) => {
      const barracks = edited.world.places["barracks"];
      if (barracks?.mortar !== undefined) {
        barracks.mortar.npc = "soldier-missing";
      }
    });
    expect(() => buildRegistries(config)).toThrow(/is not a defender/);
  });
});
