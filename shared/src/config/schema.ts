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
  evolutions: z.array(
    z.strictObject({
      into: id,
      cost: z.int().positive(),
    }),
  ),
});

const npcTypeSchema = z.strictObject({
  corpse: id,
});

const unitsSchema = z.strictObject({
  units: z.record(id, unitTypeSchema),
  npcs: z.record(id, npcTypeSchema),
});

const equipmentSchema = z.strictObject({
  items: z.record(id, z.strictObject({})),
});

const worldSchema = z.strictObject({
  width: structural(z.int().positive()),
  height: structural(z.int().positive()),
  gridCellSize: structural(z.number().positive()),
  spawnMargin: z.number().nonnegative(),
  decor: z.strictObject({
    seed: z.int().nonnegative(),
    scattered: z.array(
      z.strictObject({
        sprite: id,
        count: z.int().nonnegative(),
      }),
    ),
  }),
  pointsOfInterest: z.record(id, z.strictObject({})),
});

const eventsSchema = z.strictObject({
  events: z.record(id, z.strictObject({})),
});

const lobbySchema = z.strictObject({
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
});

const networkSchema = z.strictObject({
  tickRate: structural(z.int().positive().max(255)),
  interpolationDelayMs: z.int().nonnegative(),
  interestMargin: z.number().nonnegative(),
  maxViewSize: z.number().positive(),
  maxMessageBytes: structural(z.int().positive()),
});

const color = z.string().regex(/^#[0-9a-f]{6}$/i);

export const clientSettingsSchema = z.strictObject({
  maxPixelRatio: z.number().positive(),
  pixelsPerMeter: z.number().positive(),
  markerDurationMs: z.int().positive(),
  armyColors: z.array(color).min(1),
  walkFrameMs: z.int().positive(),
  grimoireBobMs: z.int().positive(),
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
  content: z.strictObject({
    units: z.array(id),
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
  content: {
    units: Object.keys(config.units.units),
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
