import { z } from "zod";

export const structural = <T extends z.ZodType>(schema: T): T =>
  schema.meta({ structural: true });

export const isStructural = (schema: z.ZodType): boolean =>
  schema.meta()?.["structural"] === true;

const id = z.string().min(1);

const gameplaySchema = z.strictObject({
  mage: z.strictObject({
    speed: z.number().positive(),
    radius: z.number().positive(),
    baseHp: z.number().positive(),
    hpPerLevel: z.number().nonnegative(),
    regenDelaySec: z.number().nonnegative(),
    regenPerSec: z.number().nonnegative(),
  }),
  respawn: z.strictObject({
    delaySec: z.number().nonnegative(),
    bigArmyStrength: z.number().nonnegative(),
    safeDistance: z.number().nonnegative(),
  }),
  army: z.strictObject({
    startingUnits: z.array(
      z.strictObject({
        unit: id,
        count: z.int().positive(),
      }),
    ),
    spawnRadius: z.number().positive(),
  }),
  movement: z.strictObject({
    separation: z.number().positive().max(1),
  }),
  combat: z.strictObject({
    retargetIntervalSec: z.number().positive(),
    leashDistance: z.number().positive(),
    orderRange: z.number().positive(),
  }),
  reanimation: z.strictObject({
    delaySec: z.number().nonnegative(),
    raiseRadius: z.number().positive(),
    riseSec: z.number().positive(),
  }),
  souls: z.strictObject({
    perStrength: z.number().nonnegative(),
    levelBase: z.number().positive(),
    levelGrowth: z.number().min(1),
  }),
  demo: z.strictObject({
    killerName: z.string(),
    event: id,
    eventDistance: z.number().nonnegative(),
    unit: id,
    unitCount: z.int().positive(),
  }),
});

const formationsSchema = z.strictObject({
  default: z.strictObject({
    spacing: z.number().positive(),
    frontOffset: z.number().nonnegative(),
    backOffset: z.number().nonnegative(),
  }),
});

export const ranks = ["front", "back"] as const;

const unitTypeSchema = z.strictObject({
  strength: z.int().positive(),
  rank: z.enum(ranks),
  speed: z.number().positive(),
  radius: z.number().positive(),
  hp: z.number().positive(),
  damage: z.number().nonnegative(),
  attackIntervalSec: z.number().positive(),
  attackRange: z.number().nonnegative(),
  aggroRange: z.number().positive(),
  evolutions: z.array(
    z.strictObject({
      into: id,
      cost: z.int().positive(),
    }),
  ),
});

const npcTypeSchema = z.strictObject({
  name: z.string().min(1),
  corpse: id.optional(),
  infects: z.boolean(),
  strength: z.int().positive(),
  hp: z.number().positive(),
  radius: z.number().positive(),
  speed: z.number().nonnegative(),
  fleeSpeed: z.number().positive().optional(),
  attack: z
    .strictObject({
      damage: z.number().nonnegative(),
      attackIntervalSec: z.number().positive(),
      attackRange: z.number().nonnegative(),
      aggroRange: z.number().positive(),
      leashDistance: z.number().positive(),
    })
    .optional(),
});

const unitsSchema = z.strictObject({
  units: z.record(id, unitTypeSchema),
  npcs: z.record(id, npcTypeSchema),
});

const equipmentSchema = z.strictObject({
  items: z.record(id, z.strictObject({})),
});

export const rewards = ["corpses"] as const;

const pointOfInterestSchema = z.strictObject({
  count: z.int().nonnegative(),
  radius: z.number().positive(),
  searchSec: z.number().nonnegative(),
  lifetimeSec: z
    .strictObject({ min: z.number().positive(), max: z.number().positive() })
    .refine((lifetime) => lifetime.min <= lifetime.max, {
      message: "min must not exceed max",
    }),
  reward: z.enum(rewards),
});

const worldSchema = z.strictObject({
  width: structural(z.int().positive()),
  height: structural(z.int().positive()),
  gridCellSize: structural(z.number().positive()),
  spawnMargin: z.number().nonnegative(),
  spawnAttempts: z.int().positive(),
  populations: z.array(
    z.strictObject({
      npc: id,
      count: z.int().nonnegative(),
      groupSize: z
        .strictObject({ min: z.int().positive(), max: z.int().positive() })
        .refine((size) => size.min <= size.max, {
          message: "min must not exceed max",
        }),
      groupSpread: z.number().nonnegative(),
      wanderDistance: z.number().positive(),
      wanderIntervalSec: z.number().positive(),
      fleeRadius: z.number().positive(),
      respawnIntervalSec: z.number().positive(),
      safeDistance: z.number().nonnegative(),
    }),
  ),
  decor: z.strictObject({
    seed: z.int().nonnegative(),
    scattered: z.array(
      z.strictObject({
        sprite: id,
        count: z.int().nonnegative(),
      }),
    ),
    fixed: z.array(
      z.strictObject({
        sprite: id,
        x: z.number(),
        y: z.number(),
      }),
    ),
  }),
  pointsOfInterest: z.record(id, pointOfInterestSchema),
  massGrave: id,
});

const eventsSchema = z.strictObject({
  events: z.record(
    id,
    z.strictObject({
      boss: id,
      minion: id,
      firstDelaySec: z.number().nonnegative(),
      intervalSec: z.number().positive(),
      lifetimeSec: z.number().positive(),
      safeDistance: z.number().nonnegative(),
      summonIntervalSec: z.number().positive(),
      summonCount: z.int().nonnegative(),
      maxMinions: z.int().nonnegative(),
      summonRadius: z.number().positive(),
      rewardSouls: z.number().nonnegative(),
    }),
  ),
});

export const maxParticipants = 254;

const lobbySchema = z
  .strictObject({
    minParticipants: z.int().nonnegative(),
    maxParticipants: z.int().positive().max(maxParticipants),
    graceSec: z.number().nonnegative(),
    bots: z.strictObject({
      names: z.array(z.string().min(1)).min(1),
      thinkIntervalSec: z.number().positive(),
      wanderDistance: z.number().positive(),
      huntRange: z.number().positive(),
      lootRange: z.number().positive(),
    }),
    leaderboard: z.strictObject({
      intervalSec: z.number().positive(),
      size: z.int().positive().max(255),
    }),
    playerName: z.strictObject({
      minLength: z.int().positive(),
      maxLength: z.int().positive().max(255),
      pattern: z.string().refine(
        (value) => {
          try {
            new RegExp(value, "u");
            return true;
          } catch {
            return false;
          }
        },
        { message: "Invalid regular expression" },
      ),
    }),
  })
  .refine((lobby) => lobby.minParticipants <= lobby.maxParticipants, {
    message: "minParticipants must not exceed maxParticipants",
  });

const networkSchema = z.strictObject({
  tickRate: structural(z.int().positive().max(255)),
  interpolationDelayMs: z.int().nonnegative(),
  interestMargin: z.number().nonnegative(),
  maxViewSize: z.number().positive(),
  maxMessageBytes: structural(z.int().positive()),
});

const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const url = z.string().min(1);
const volume = z.number().min(0).max(1);

const effectSchema = z.strictObject({
  url,
  volume,
  gapMs: z.int().nonnegative(),
});

export const clientSettingsSchema = z.strictObject({
  maxPixelRatio: z.number().positive(),
  pixelsPerMeter: z.number().positive(),
  markerDurationMs: z.int().positive(),
  pickRadius: z.number().positive(),
  armyColors: z.array(color).min(1),
  walkFrameMs: z.int().positive(),
  attackFrameMs: z.int().positive(),
  deathMs: z.int().positive(),
  soulBobMs: z.int().positive(),
  grimoireBobMs: z.int().positive(),
  audio: z.strictObject({
    masterVolume: volume,
    musicVolume: volume,
    effectsVolume: volume,
    fadeSec: z.number().positive(),
    combatFullUnits: z.int().positive(),
    music: z.strictObject({
      exploration: url,
      combat: url,
      boss: url,
    }),
    effects: z.strictObject({
      hit: effectSchema,
      death: effectSchema,
      rise: effectSchema,
      scream: effectSchema,
      boss: effectSchema,
    }),
  }),
  screamer: z.strictObject({
    image: url,
    durationMs: z.int().positive(),
    vibrateMs: z.array(z.int().positive()),
  }),
  announceMs: z.int().positive(),
  arrowMargin: z.number().nonnegative(),
  demoKeys: z.strictObject({
    screamer: z.string().length(1),
    boss: z.string().length(1),
    units: z.string().length(1),
  }),
});

export const configSchema = z.strictObject({
  gameplay: gameplaySchema,
  formations: formationsSchema,
  units: unitsSchema,
  equipment: equipmentSchema,
  world: worldSchema,
  events: eventsSchema,
  lobby: lobbySchema,
  network: networkSchema,
  client: clientSettingsSchema,
});

export type Config = z.infer<typeof configSchema>;
export type ConfigFile = keyof Config;

export const clientConfigSchema = z.strictObject({
  client: clientSettingsSchema,
  world: worldSchema.pick({ width: true, height: true, decor: true }),
  network: networkSchema.pick({ tickRate: true, interpolationDelayMs: true }),
  gameplay: z.strictObject({
    riseSec: z.number().positive(),
  }),
  content: z.strictObject({
    units: z.array(id),
    npcs: z.array(id),
    pointsOfInterest: z.array(id),
    events: z.array(z.strictObject({ id, name: z.string().min(1) })),
  }),
});

export type ClientConfig = z.infer<typeof clientConfigSchema>;

export const toClientConfig = (config: Config): ClientConfig => ({
  client: config.client,
  world: {
    width: config.world.width,
    height: config.world.height,
    decor: config.world.decor,
  },
  network: {
    tickRate: config.network.tickRate,
    interpolationDelayMs: config.network.interpolationDelayMs,
  },
  gameplay: {
    riseSec: config.gameplay.reanimation.riseSec,
  },
  content: {
    units: Object.keys(config.units.units),
    npcs: Object.keys(config.units.npcs),
    pointsOfInterest: Object.keys(config.world.pointsOfInterest),
    events: Object.entries(config.events.events).map(([eventId, event]) => ({
      id: eventId,
      name: config.units.npcs[event.boss]?.name ?? eventId,
    })),
  },
});

export const structuralPaths = (
  schema: z.ZodType,
  prefix: string[] = [],
): string[][] => {
  if (isStructural(schema)) {
    return [prefix];
  }
  if (schema instanceof z.ZodObject) {
    return Object.entries(schema.shape as Record<string, z.ZodType>).flatMap(
      ([key, child]) => structuralPaths(child, [...prefix, key]),
    );
  }
  return [];
};
