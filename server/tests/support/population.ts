import type { Config } from "@horde/shared";

export const civilianPopulation = (
  overrides: Partial<Config["world"]["populations"][number]> = {},
): Config["world"]["populations"][number] => ({
  npc: "civilian",
  count: 12,
  groupSize: { min: 3, max: 3 },
  groupSpread: 2,
  wanderDistance: 10,
  wanderIntervalSec: 5,
  fleeRadius: 8,
  respawnIntervalSec: 1,
  safeDistance: 30,
  ...overrides,
});
