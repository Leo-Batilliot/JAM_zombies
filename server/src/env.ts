import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(0).max(65535),
  DEMO_MODE: z.enum(["true", "false"]).transform((value) => value === "true"),
  CONFIG_DIR: z.string().min(1),
  CONFIG_RELOAD_DELAY_MS: z.coerce.number().int().nonnegative(),
  CLIENT_DIR: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export const loadEnv = (source: NodeJS.ProcessEnv = process.env): Env => {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `Invalid environment, copy .env.example to .env:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
};
