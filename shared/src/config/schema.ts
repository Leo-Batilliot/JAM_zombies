import { z } from "zod";

export const structural = <T extends z.ZodType>(schema: T): T =>
  schema.meta({ structural: true });

export const isStructural = (schema: z.ZodType): boolean =>
  schema.meta()?.["structural"] === true;

const id = z.string().min(1);

export const maxSkins = 0x100;

export const giftEffects = [
  "heal",
  "reanimation",
  "soulLink",
  "speed",
  "vision",
  "loot",
  "hp",
] as const;

export const spellEffects = ["nova", "rally", "wall", "raise"] as const;

export const giftSchema = z.strictObject({
  name: z.string().min(1),
  effect: z.enum(giftEffects),
  value: z.number().positive(),
  radius: z.number().positive().optional(),
  maxStacks: z.int().positive(),
});

export const spellSchema = z.strictObject({
  name: z.string().min(1),
  effect: z.enum(spellEffects),
  cooldownSec: z.number().nonnegative(),
  radius: z.number().positive().optional(),
  damage: z.number().positive().optional(),
  durationSec: z.number().positive().optional(),
  multiplier: z.number().positive().optional(),
  length: z.number().positive().optional(),
  spacing: z.number().positive().optional(),
  offset: z.number().nonnegative().optional(),
  npc: id.optional(),
});

const gameplaySchema = z.strictObject({
  mage: z.strictObject({
    speed: z.number().positive(),
    radius: z.number().positive(),
    baseHp: z.number().positive(),
    hpPerLevel: z.number().nonnegative(),
    regenDelaySec: z.number().nonnegative(),
    regenPerSec: z.number().nonnegative(),
    attack: z.strictObject({
      damage: z.number().positive(),
      intervalSec: z.number().positive(),
      range: z.number().positive(),
      projectile: id,
    }),
    skins: z
      .record(id, z.strictObject({ name: z.string().min(1) }))
      .refine(
        (list) =>
          Object.keys(list).length > 0 && Object.keys(list).length <= maxSkins,
        { message: `Between 1 and ${String(maxSkins)} skins` },
      ),
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
    starterCivilians: z.strictObject({
      npc: id,
      count: z.int().nonnegative(),
      distance: z.number().nonnegative(),
    }),
    cap: z.int().positive(),
    slowdown: z.strictObject({
      scale: z.number().positive(),
      factor: z.number().nonnegative(),
      max: z.number().min(0).lt(1),
    }),
  }),
  movement: z.strictObject({
    separation: z.number().positive().max(1),
  }),
  combat: z.strictObject({
    retargetIntervalSec: z.number().positive(),
    leashDistance: z.number().positive(),
    orderRange: z.number().positive(),
    avoidRatio: z.number().positive(),
    contactRange: z.number().nonnegative(),
  }),
  reanimation: z.strictObject({
    delaySec: z.number().nonnegative(),
    raiseRadius: z.number().positive(),
    riseSec: z.number().positive(),
    crossDelaySec: z.number().nonnegative(),
  }),
  battle: z.strictObject({
    engageRadius: z.number().positive(),
    endDelaySec: z.number().nonnegative(),
    fleeDistance: z.number().positive(),
  }),
  soulLink: z.strictObject({
    guardRadius: z.number().positive(),
    share: z.number().min(0).max(1),
    maxLossPerSec: z.number().positive(),
  }),
  transfer: z.strictObject({
    share: z.number().min(0).max(1),
  }),
  regroup: z.strictObject({
    arriveDistance: z.number().positive(),
    speedMultiplier: z.number().min(1),
  }),
  detection: z.strictObject({
    base: z.number().nonnegative(),
    perStrength: z.number().nonnegative(),
    max: z.number().nonnegative(),
  }),
  souls: z.strictObject({
    perStrength: z.number().nonnegative(),
    levelBase: z.number().positive(),
    levelGrowth: z.number().min(1),
  }),
  levelUp: z.strictObject({
    choices: z.int().positive().max(0xff),
    mutationWeight: z.number().nonnegative(),
    presentWeight: z.number().min(1),
    giftWeight: z.number().nonnegative(),
    spellWeight: z.number().nonnegative(),
  }),
  fusion: z.strictObject({
    intervalSec: z.number().positive(),
  }),
  gifts: z.record(id, giftSchema),
  spells: z.record(id, spellSchema),
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
  cooldownSec: z.number().nonnegative(),
  turn: z.strictObject({
    distance: z.number().nonnegative(),
    angleDeg: z.number().min(0).max(180),
    degPerSec: z.number().positive(),
  }),
  neutral: formationSchema,
  selectable: z
    .record(id, formationSchema)
    .refine((list) => Object.keys(list).length < 0xff, {
      message: "Too many formations",
    }),
});

export const ranks = ["front", "back"] as const;

export const layers = ["ground", "air", "ethereal"] as const;
export type Layer = (typeof layers)[number];

const unitTypeSchema = z.strictObject({
  name: z.string().min(1),
  family: id,
  bonus: z.record(id, z.number().positive()),
  projectile: id.optional(),
  equipment: id.optional(),
  strength: z.int().positive(),
  rank: z.enum(ranks),
  layer: z.enum(layers).optional(),
  speed: z.number().positive(),
  radius: z.number().positive(),
  hp: z.number().positive(),
  damage: z.number().nonnegative(),
  attackIntervalSec: z.number().positive(),
  attackRange: z.number().nonnegative(),
  aggroRange: z.number().positive(),
});

export const lineageSchema = z.strictObject({
  name: z.string().min(1),
  base: id,
  branches: z.record(
    id,
    z.strictObject({
      name: z.string().min(1),
      tiers: z.array(id).min(1),
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
  layer: z.enum(layers).optional(),
  speed: z.number().nonnegative(),
  fleeSpeed: z.number().positive().optional(),
  obstacle: z.boolean(),
  fatigue: z
    .strictObject({
      afterSec: z.number().nonnegative(),
      factor: z.number().positive().max(1),
    })
    .optional(),
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

const abilitiesSchema = z.strictObject({
  charge: z
    .strictObject({
      intervalSec: z.number().positive(),
      radius: z.number().positive(),
      damage: z.number().nonnegative(),
      knockback: z.number().nonnegative(),
      maxStrength: z.int().positive(),
    })
    .optional(),
  execute: z.number().min(0).max(1).optional(),
  cleave: z
    .strictObject({
      radius: z.number().positive(),
      ratio: z.number().positive(),
    })
    .optional(),
  heal: z
    .strictObject({
      radius: z.number().positive(),
      perSec: z.number().positive(),
    })
    .optional(),
  prefersBack: z.boolean().optional(),
});

const unitsSchema = z.strictObject({
  units: z.record(id, unitTypeSchema),
  champions: z.record(id, z.strictObject({ abilities: abilitiesSchema })),
  npcs: z.record(id, npcTypeSchema),
  projectiles: z.record(id, z.strictObject({ speed: z.number().positive() })),
  fusionRatio: z.int().min(2),
  lineages: z.record(id, lineageSchema),
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
        speed: z.number().positive().optional(),
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
  districts: z.array(id).optional(),
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
  groundOnly: z.boolean().optional(),
});

const placeSchema = z.strictObject({
  district: id,
  at: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  spread: z.number().positive(),
  safeDistance: z.number().nonnegative(),
  respawnSec: z.number().positive(),
  defenders: z
    .array(z.strictObject({ npc: id, count: z.int().positive() }))
    .min(1),
  chest: id,
  champion: id.optional(),
  rampart: z.boolean().optional(),
  gas: z
    .strictObject({
      mist: id,
      count: z.int().positive(),
      spread: z.number().nonnegative(),
    })
    .optional(),
  mortar: z
    .strictObject({
      npc: id,
      range: z.number().positive(),
      intervalSec: z.number().positive(),
    })
    .optional(),
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
  districts: z.array(id).optional(),
});

const bombingsSchema = z.strictObject({
  name: z.string().min(1),
  firstDelaySec: z.number().nonnegative(),
  intervalSec: lifetimeSchema,
  zones: z.int().nonnegative(),
  radius: z.number().positive(),
  spread: z.number().nonnegative(),
  delaySec: z.number().nonnegative(),
  blastSec: z.number().positive(),
  damage: z.number().nonnegative(),
  crowding: z.number().nonnegative(),
  maxMultiplier: z.number().min(1),
});

const fraction = z.number().min(0).max(1);

const cityShapeSchema = z.union([
  z.strictObject({
    kind: id,
    rect: z.tuple([fraction, fraction, fraction, fraction]),
  }),
  z.strictObject({ kind: id, circle: z.tuple([fraction, fraction, fraction]) }),
]);

const compositionSchema = z.strictObject({
  items: z.array(
    z.strictObject({
      sprite: id,
      x: z.number(),
      y: z.number(),
      light: z.number().positive().optional(),
    }),
  ),
  scatter: z
    .strictObject({
      sprites: z.array(id).min(1),
      count: z.int().nonnegative(),
      radius: z.number().positive(),
    })
    .optional(),
});

const districtTemplateSchema = z
  .strictObject({
    name: z.string().min(1),
    weight: z.number().nonnegative(),
    min: z.int().nonnegative(),
    max: z.int().positive(),
    ground: id,
    tags: z.array(id),
    obstacles: z.array(cityShapeSchema),
    decor: z.array(
      z.strictObject({
        composition: id,
        at: z.tuple([fraction, fraction]),
      }),
    ),
  })
  .refine((template) => template.min <= template.max, {
    message: "min must not exceed max",
  });

export const citySchema = z.strictObject({
  border: z.number().nonnegative(),
  clearance: z.number().nonnegative(),
  cellSize: z.number().positive(),
  columns: z.int().positive(),
  rows: z.int().positive(),
  street: z.number().nonnegative(),
  streetGround: id,
  templates: z.record(id, districtTemplateSchema),
  compositions: z.record(id, compositionSchema),
});

const worldSchema = z.strictObject({
  width: structural(z.int().positive()),
  height: structural(z.int().positive()),
  gridCellSize: structural(z.number().positive()),
  spawnMargin: z.number().nonnegative(),
  spawnAttempts: z.int().positive(),
  spawnSpacing: z.number().nonnegative(),
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
      districts: z.array(id).optional(),
      route: z.array(id).optional(),
      lineSpacing: z.number().positive().optional(),
      raid: z
        .strictObject({
          attackRatio: z.number().positive(),
          fleeHpRatio: fraction,
          encircle: z.number().nonnegative(),
        })
        .optional(),
    }),
  ),
  city: structural(citySchema),
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
  places: z.record(id, placeSchema),
  bombings: bombingsSchema,
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
      districts: z.array(id).optional(),
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
    maxLobbies: z.int().positive(),
    graceSec: z.number().nonnegative(),
    spectators: z.strictObject({
      max: z.int().nonnegative(),
      holdSec: z.number().nonnegative(),
      battleStrength: z.number().nonnegative(),
    }),
    bots: z.strictObject({
      names: z.array(z.string().min(1)).min(1),
      thinkIntervalSec: z.number().positive(),
      wanderDistance: z.number().positive(),
      huntRange: z.number().positive(),
      lootRange: z.number().positive(),
      attackRange: z.number().positive(),
      attackRatio: z.number().positive(),
      fleeRatio: z.number().positive(),
      fleeDistance: z.number().positive(),
      giveUp: z.strictObject({
        maxSec: z.number().positive(),
        minSec: z.number().nonnegative(),
        ignoreSec: z.number().nonnegative(),
      }),
      crossMargin: z.number().nonnegative(),
      campRange: z.number().positive(),
      championRange: z.number().positive(),
      campRatio: z.number().positive(),
      bountyRange: z.number().positive(),
      bountyRatio: z.number().positive(),
      formations: z.strictObject({
        explore: id,
        attack: id,
        defend: id,
      }),
      stuck: z.strictObject({
        distance: z.number().nonnegative(),
        detour: z.number().positive(),
      }),
      handicap: z.strictObject({
        margin: z.number().nonnegative(),
        ratio: z.number().positive(),
        slowFrom: z.number().min(0).lt(1),
        thinkSlowdown: z.number().min(1),
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

const obstacleLookSchema = z.union([
  z.strictObject({
    roof: id,
    wall: id,
    wallMeters: z.number().nonnegative(),
  }),
  z.strictObject({
    sprite: id,
    scale: z.number().positive(),
    anchorY: fraction,
  }),
]);

const ringSchema = z.strictObject({
  color,
  radius: z.number().positive(),
  width: z.number().positive(),
  durationMs: z.int().positive(),
});

const cityLookSchema = z.strictObject({
  tilePixels: z.int().positive(),
  edge: color,
  grounds: z.record(
    id,
    z.strictObject({
      tile: id,
      variants: z.array(id),
      variantRate: fraction,
      minimap: color,
    }),
  ),
  obstacles: z.record(id, obstacleLookSchema),
  minimapGround: color,
  landmarks: z.record(
    id,
    z.strictObject({ symbol: z.string().min(1).max(2), color }),
  ),
  ramparts: z.strictObject({
    tower: id,
    towerSpacing: z.number().positive(),
    gate: id,
  }),
  outside: z.strictObject({
    depth: z.number().positive(),
    ground: id,
    trees: z.array(id).min(1),
    treeSpacing: z.number().positive(),
    shade: color,
    shadeAlpha: fraction,
  }),
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
      blast: effectSchema,
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
  sizeScaleStep: z.number().nonnegative(),
  hpBar: z.strictObject({
    width: z.number().positive(),
    height: z.number().positive(),
    offsetY: z.number(),
    growth: z.number().nonnegative(),
    mageScale: z.number().positive(),
    background: color,
    ally: color,
    enemy: color,
  }),
  outline: z.strictObject({
    ally: color,
    enemy: color,
    useful: color,
    alpha: z.number().min(0).max(1),
  }),
  plates: z.strictObject({
    offsetY: z.number(),
    fontSize: z.number().positive(),
  }),
  camera: z.strictObject({
    baseZoom: z.number().positive(),
    minZoom: z.number().positive().max(1),
    strengthScale: z.number().positive(),
    factor: z.number().nonnegative(),
    smoothing: z.number().positive().max(1),
    resendRatio: z.number().nonnegative(),
    smallScreen: z.number().positive(),
    smallScreenZoom: z.number().positive(),
    smallScreenPixelRatio: z.number().positive(),
  }),
  lootMs: z.int().positive(),
  minimapSize: z.int().positive(),
  gearOffsets: z.record(id, z.strictObject({ x: z.number(), y: z.number() })),
  mistColors: z.record(id, color),
  bombingColors: z.strictObject({ mark: color, blast: color }),
  formationKeys: z.array(z.string().length(1)),
  spellKey: z.string().length(1),
  spriteAliases: z.record(
    id,
    z.strictObject({ sprite: id, scale: z.number().positive() }),
  ),
  cardArtScale: z.number().positive(),
  cardLockMs: z.int().nonnegative(),
  city: cityLookSchema,
  layerLook: z.strictObject({
    airLift: z.number().nonnegative(),
    shadowAlpha: fraction,
    etherealAlpha: fraction,
  }),
  effects: z.strictObject({
    fusion: ringSchema,
    levelUp: ringSchema,
  }),
  night: z.strictObject({
    color,
    alpha: fraction,
    resolution: z.number().positive().max(1),
    lights: z.record(id, z.number().positive()),
    minFps: z.number().positive(),
    slowSec: z.number().positive(),
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
  citySeed: z.int().nonnegative(),
  world: worldSchema.pick({
    width: true,
    height: true,
    city: true,
    crosses: true,
    bombings: true,
  }),
  network: networkSchema.pick({ tickRate: true, interpolationDelayMs: true }),
  gameplay: z.strictObject({
    riseSec: z.number().positive(),
    leaderboardSize: z.int().positive(),
  }),
  content: z.strictObject({
    units: z.array(
      z.strictObject({
        id,
        name: z.string().min(1),
        strength: z.int().positive(),
        equipment: id.optional(),
        hp: z.number().positive(),
        damage: z.number().nonnegative(),
        attackIntervalSec: z.number().positive(),
        speed: z.number().positive(),
        attackRange: z.number().nonnegative(),
      }),
    ),
    items: z.array(
      z.strictObject({ id, name: z.string().min(1), category: id }),
    ),
    npcs: z.array(id),
    obstacles: z.array(z.int().nonnegative()),
    pointsOfInterest: z.array(id),
    events: z.array(z.strictObject({ id, name: z.string().min(1) })),
    projectiles: z.array(id),
    mists: z.array(z.strictObject({ id, radius: z.number().positive() })),
    formations: z.array(z.strictObject({ id, name: z.string().min(1) })),
    skins: z.array(z.strictObject({ id, name: z.string().min(1) })),
    lineages: z.array(lineageSchema.extend({ id })),
    layers: z.record(id, z.enum(layers)),
    places: z.array(id),
    champions: z.array(id),
    gifts: z.array(giftSchema.extend({ id })),
    spells: z.array(spellSchema.extend({ id })),
  }),
});

export type ClientConfig = z.infer<typeof clientConfigSchema>;

const withIds = <T extends object>(
  entries: Record<string, T>,
): (T & { id: string })[] =>
  Object.entries(entries).map(([entryId, entry]) => ({
    ...entry,
    id: entryId,
  }));

export const toClientConfig = (
  config: Config,
  citySeed: number,
): ClientConfig => ({
  client: config.client,
  citySeed,
  world: {
    width: config.world.width,
    height: config.world.height,
    city: config.world.city,
    crosses: config.world.crosses,
    bombings: config.world.bombings,
  },
  network: {
    tickRate: config.network.tickRate,
    interpolationDelayMs: config.network.interpolationDelayMs,
  },
  gameplay: {
    riseSec: config.gameplay.reanimation.riseSec,
    leaderboardSize: config.lobby.leaderboard.size,
  },
  content: {
    units: Object.entries(config.units.units).map(([unitId, unit]) => ({
      id: unitId,
      name: unit.name,
      strength: unit.strength,
      ...(unit.equipment === undefined ? {} : { equipment: unit.equipment }),
      hp: unit.hp,
      damage: unit.damage,
      attackIntervalSec: unit.attackIntervalSec,
      speed: unit.speed,
      attackRange: unit.attackRange,
    })),
    items: Object.entries(config.equipment.items).map(([itemId, item]) => ({
      id: itemId,
      name: item.name,
      category: item.category,
    })),
    npcs: Object.keys(config.units.npcs),
    obstacles: Object.values(config.units.npcs).flatMap((npc, index) =>
      npc.obstacle ? [index] : [],
    ),
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
    skins: Object.entries(config.gameplay.mage.skins).map(([skinId, skin]) => ({
      id: skinId,
      name: skin.name,
    })),
    lineages: withIds(config.units.lineages),
    layers: Object.fromEntries(
      [
        ...Object.entries(config.units.units),
        ...Object.entries(config.units.npcs),
      ].flatMap(([typeId, type]) =>
        type.layer === undefined || type.layer === "ground"
          ? []
          : [[typeId, type.layer]],
      ),
    ),
    places: Object.keys(config.world.places),
    champions: Object.keys(config.units.champions),
    gifts: withIds(config.gameplay.gifts),
    spells: withIds(config.gameplay.spells),
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
