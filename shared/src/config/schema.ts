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
    cap: z.int().positive(),
    slowdown: z
      .strictObject({
        from: z.int().nonnegative(),
        to: z.int().positive(),
        penalty: z.number().min(0).max(1),
      })
      .refine((slowdown) => slowdown.from < slowdown.to, {
        message: "from must be below to",
      }),
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
    crossDelaySec: z.number().nonnegative(),
  }),
  battle: z.strictObject({
    engageRadius: z.number().positive(),
    circleMargin: z.number().nonnegative(),
    endDelaySec: z.number().nonnegative(),
    freeSectorDeg: z.number().positive().max(360),
  }),
  soulLink: z.strictObject({
    guardRadius: z.number().positive(),
    share: z.number().min(0).max(1),
    maxLossPerSec: z.number().positive(),
  }),
  transfer: z.strictObject({
    share: z.number().min(0).max(1),
  }),
  retreat: z.strictObject({
    minTunnelUnits: z.int().positive(),
    corridorWidth: z.number().positive(),
    spacing: z.number().positive(),
    baseOffset: z.number().nonnegative(),
    wingRows: z.int().nonnegative(),
    wingFlare: z.number().nonnegative(),
    wingReach: z.number().positive(),
    foldMargin: z.number().nonnegative(),
    escortRadius: z.number().positive(),
    arriveDistance: z.number().positive(),
  }),
  regroup: z.strictObject({
    distance: z.number().positive(),
    arriveDistance: z.number().positive(),
    speedMultiplier: z.number().min(1),
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

export const layouts = ["block", "wedge", "ring", "cloud"] as const;

const formationSchema = z.strictObject({
  name: z.string().min(1),
  layout: z.enum(layouts),
  spacing: z.number().positive(),
  frontOffset: z.number().nonnegative(),
  backOffset: z.number().nonnegative(),
  width: z.number().positive(),
  speed: z.number().positive(),
  defense: z.number().lt(1),
  impact: z
    .strictObject({
      damage: z.number().positive(),
      durationSec: z.number().positive(),
    })
    .optional(),
  fullGuard: z.boolean(),
});

const formationsSchema = z.strictObject({
  changeSec: z.number().nonnegative(),
  neutral: formationSchema,
  selectable: z
    .record(id, formationSchema)
    .refine((list) => Object.keys(list).length < 0xff, {
      message: "Too many formations",
    }),
});

export const ranks = ["front", "back"] as const;

const unitTypeSchema = z.strictObject({
  name: z.string().min(1),
  family: id,
  bonus: z.record(id, z.number().positive()),
  projectile: id.optional(),
  equipment: id.optional(),
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
      projectile: id.optional(),
    })
    .optional(),
});

const unitsSchema = z.strictObject({
  units: z.record(id, unitTypeSchema),
  npcs: z.record(id, npcTypeSchema),
  projectiles: z.record(id, z.strictObject({ speed: z.number().positive() })),
});

const equipmentSchema = z
  .strictObject({
    rarities: z.array(id).min(1),
    items: z.record(
      id,
      z.strictObject({
        name: z.string().min(1),
        category: id,
        rarity: id,
        damage: z.number().positive().optional(),
        hp: z.number().positive().optional(),
        armor: z.number().min(0).lt(1).optional(),
      }),
    ),
  })
  .refine(
    (equipment) =>
      Object.values(equipment.items).every((item) =>
        equipment.rarities.includes(item.rarity),
      ),
    { message: "Every item rarity must be listed in rarities" },
  );

const lootSchema = z
  .array(z.strictObject({ item: id, weight: z.number().positive() }))
  .min(1);

export const rewards = ["corpses", "items", "units"] as const;

const lifetimeSchema = z
  .strictObject({ min: z.number().positive(), max: z.number().positive() })
  .refine((lifetime) => lifetime.min <= lifetime.max, {
    message: "min must not exceed max",
  });

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
  loot: lootSchema.optional(),
  units: z
    .strictObject({
      unit: id,
      min: z.int().positive(),
      max: z.int().positive(),
    })
    .refine((units) => units.min <= units.max, {
      message: "min must not exceed max",
    })
    .optional(),
});

const mistSchema = z.strictObject({
  name: z.string().min(1),
  count: z.int().nonnegative(),
  radius: z.number().positive(),
  speed: z.number().nonnegative(),
  turnIntervalSec: z.number().positive(),
  lifetimeSec: lifetimeSchema,
  damagePerSec: z.number().nonnegative(),
  reanimationDelaySec: z.number().nonnegative().optional(),
});

const campsSchema = z.strictObject({
  count: z.int().nonnegative(),
  spread: z.number().positive(),
  safeDistance: z.number().nonnegative(),
  lifetimeSec: lifetimeSchema,
  defenders: z
    .array(z.strictObject({ npc: id, count: z.int().positive() }))
    .min(1),
  chest: id,
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
  crosses: z.strictObject({
    count: z.int().nonnegative(),
    radius: z.number().positive(),
    threshold: z.int().positive(),
    rechargeSec: z.number().nonnegative(),
    spacing: z.number().nonnegative(),
    lifetimeSec: z
      .strictObject({ min: z.number().positive(), max: z.number().positive() })
      .refine((lifetime) => lifetime.min <= lifetime.max, {
        message: "min must not exceed max",
      }),
  }),
  mists: z.record(id, mistSchema),
  camps: campsSchema,
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
      rewardLoot: lootSchema,
      rewardLegendary: id,
    }),
  ),
  bounty: z.strictObject({
    souls: z.number().nonnegative(),
  }),
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
      attackRange: z.number().positive(),
      attackRatio: z.number().positive(),
      fleeRatio: z.number().positive(),
      avoidSectorDeg: z.number().nonnegative().max(360),
      fleeDistance: z.number().positive(),
      crossMargin: z.number().nonnegative(),
      campRange: z.number().positive(),
      campRatio: z.number().positive(),
      bountyRange: z.number().positive(),
      bountyRatio: z.number().positive(),
      formations: z.strictObject({
        explore: id,
        attack: id,
        defend: id,
      }),
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
  retreatKey: z.string().length(1),
  sizeScaleStep: z.number().nonnegative(),
  aggroPulseMs: z.int().positive(),
  lootMs: z.int().positive(),
  minimapSize: z.int().positive(),
  gearOffsets: z.record(id, z.strictObject({ x: z.number(), y: z.number() })),
  mistColors: z.record(id, color),
  formationKeys: z.array(z.string().length(1)),
  evolutionCollapseMs: z.int().positive(),
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
  world: worldSchema.pick({
    width: true,
    height: true,
    decor: true,
    crosses: true,
  }),
  network: networkSchema.pick({ tickRate: true, interpolationDelayMs: true }),
  gameplay: z.strictObject({
    riseSec: z.number().positive(),
  }),
  content: z.strictObject({
    units: z.array(
      z.strictObject({
        id,
        name: z.string().min(1),
        equipment: id.optional(),
        evolutions: unitTypeSchema.shape.evolutions,
      }),
    ),
    items: z.array(
      z.strictObject({ id, name: z.string().min(1), category: id }),
    ),
    npcs: z.array(id),
    pointsOfInterest: z.array(id),
    events: z.array(z.strictObject({ id, name: z.string().min(1) })),
    projectiles: z.array(id),
    mists: z.array(z.strictObject({ id, radius: z.number().positive() })),
    formations: z.array(z.strictObject({ id, name: z.string().min(1) })),
  }),
});

export type ClientConfig = z.infer<typeof clientConfigSchema>;

export const toClientConfig = (config: Config): ClientConfig => ({
  client: config.client,
  world: {
    width: config.world.width,
    height: config.world.height,
    decor: config.world.decor,
    crosses: config.world.crosses,
  },
  network: {
    tickRate: config.network.tickRate,
    interpolationDelayMs: config.network.interpolationDelayMs,
  },
  gameplay: {
    riseSec: config.gameplay.reanimation.riseSec,
  },
  content: {
    units: Object.entries(config.units.units).map(([unitId, unit]) => ({
      id: unitId,
      name: unit.name,
      ...(unit.equipment === undefined ? {} : { equipment: unit.equipment }),
      evolutions: unit.evolutions,
    })),
    items: Object.entries(config.equipment.items).map(([itemId, item]) => ({
      id: itemId,
      name: item.name,
      category: item.category,
    })),
    npcs: Object.keys(config.units.npcs),
    pointsOfInterest: Object.keys(config.world.pointsOfInterest),
    events: Object.entries(config.events.events).map(([eventId, event]) => ({
      id: eventId,
      name: config.units.npcs[event.boss]?.name ?? eventId,
    })),
    projectiles: Object.keys(config.units.projectiles),
    mists: Object.entries(config.world.mists).map(([mistId, mist]) => ({
      id: mistId,
      radius: mist.radius,
    })),
    formations: Object.entries(config.formations.selectable).map(
      ([formationId, formation]) => ({ id: formationId, name: formation.name }),
    ),
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
