import { describe, expect, test } from "vitest";
import { runBots } from "../../src/lobby/bots.js";
import {
  botCap,
  handicapFor,
  updateHandicaps,
} from "../../src/lobby/handicap.js";
import { kill } from "../../src/systems/death.js";
import { killMage } from "../../src/systems/mage.js";
import { createMassGrave, searchPoints } from "../../src/systems/points.js";
import { grantSouls } from "../../src/systems/souls.js";
import { updateTargets } from "../../src/systems/targeting.js";
import { createBench } from "../support/bench.js";

type Bench = ReturnType<typeof createBench>;

const botArmy = (bench: Bench, x = 100, y = 100, name = "Bot") => {
  const army = bench.addArmy(x, y, name);
  army.bot = {
    thinkAt: 0,
    handicap: 1,
    lastX: Number.NaN,
    lastY: Number.NaN,
    chase: undefined,
    ignored: new Map(),
  };
  return army;
};

const fill = (
  bench: Bench,
  army: ReturnType<Bench["addArmy"]>,
  count: number,
) => {
  for (let index = 0; index < count; index++) {
    bench.world.addUnit(army, "zombie", army.mage.x + 1, army.mage.y);
  }
};

describe("bot cap", () => {
  test("follows the strongest human player, with a margin", () => {
    const bench = createBench();
    const { margin, ratio } = bench.config.lobby.bots.handicap;
    expect(botCap(bench.world)).toBe(margin);
    const human = bench.addArmy(300, 300, "Human");
    fill(bench, human, 20);
    const bot = botArmy(bench);
    fill(bench, bot, 200);
    expect(botCap(bench.world)).toBe(20 * ratio + margin);
  });

  test("the handicap drops from 1 to 0 between the slowdown start and the cap", () => {
    const { world, config } = createBench();
    const { slowFrom } = config.lobby.bots.handicap;
    expect(handicapFor(world, 100 * slowFrom, 100)).toBe(1);
    expect(handicapFor(world, 100, 100)).toBe(0);
    expect(handicapFor(world, 500, 100)).toBe(0);
    expect(handicapFor(world, (100 * (1 + slowFrom)) / 2, 100)).toBeCloseTo(
      0.5,
    );
  });

  test("a bot close to the cap gains fewer souls, a player gains them all", () => {
    const bench = createBench();
    const bot = botArmy(bench);
    const human = bench.addArmy(300, 300, "Human");
    bot.bot = { ...bot.bot, handicap: 0.5 } as typeof bot.bot;
    grantSouls(bench.world, bot, 10);
    grantSouls(bench.world, human, 10);
    expect(bot.souls).toBeCloseTo(5);
    expect(human.souls).toBe(10);
  });

  test("handicaps are updated from the strength of each bot", () => {
    const bench = createBench();
    const small = botArmy(bench, 100, 100, "Small");
    const big = botArmy(bench, 200, 200, "Big");
    fill(bench, big, 100);
    updateHandicaps(bench.world);
    expect(small.bot?.handicap).toBe(1);
    expect(big.bot?.handicap).toBe(0);
  });

  test("corpses waiting to rise count toward the cap", () => {
    const bench = createBench();
    const bot = botArmy(bench);
    for (let index = 0; index < 100; index++) {
      bench.world.addCorpse("zombie", bot, undefined, 101, 100);
    }
    updateHandicaps(bench.world);
    expect(bot.bot?.handicap).toBe(0);
  });
});

describe("a capped bot stops growing", () => {
  const capped = () => {
    const bench = createBench();
    const bot = botArmy(bench);
    fill(bench, bot, 100);
    updateHandicaps(bench.world);
    return { bench, bot };
  };

  test("it gets nothing from the mage it kills", () => {
    const { bench, bot } = capped();
    const victim = bench.addArmy(150, 100, "Victim");
    fill(bench, victim, 10);
    const before = bot.units.size;
    killMage(bench.world, victim, bot);
    expect(bot.units.size).toBe(before);
    expect(bot.corpses.size).toBe(0);
    expect(
      [...bench.world.points].flatMap((point) => point.corpses),
    ).toHaveLength(10);
  });

  test("it gets neither infected civilians nor npc corpses", () => {
    const { bench, bot } = capped();
    const civilian = [...bench.addCivilians(110, 100, 1).members][0];
    if (civilian === undefined) {
      throw new Error("Expected a civilian");
    }
    const before = bot.units.size;
    kill(bench.world, civilian, bot);
    const camp = bench.world.addCamp(120, 100, 600);
    kill(bench.world, bench.world.addCampNpc(camp, "soldier", 120, 100), bot);
    expect(bot.units.size).toBe(before);
    expect(bot.corpses.size).toBe(0);
  });

  test("it does not search points of interest", () => {
    const { bench, bot } = capped();
    createMassGrave(bench.world, 100, 100, [
      { type: "zombie", item: undefined },
    ]);
    for (let tick = 0; tick < 100; tick++) {
      searchPoints(bench.world, 0.05);
    }
    expect(bench.world.points.size).toBe(1);
    expect(bot.search).toBeUndefined();
  });

  test("its units leave civilians alone", () => {
    const { bench, bot } = capped();
    bench.addCivilians(103, 100, 1);
    updateTargets(bench.world);
    expect([...bot.units].every((unit) => unit.targetId === undefined)).toBe(
      true,
    );
  });

  test("it wanders instead of hunting and thinks more slowly", () => {
    const { bench, bot } = capped();
    const civilian = [...bench.addCivilians(120, 100, 1).members][0];
    runBots(bench.world);
    expect(bot.focusId).not.toBe(civilian?.id);
    const { thinkIntervalSec, handicap } = bench.config.lobby.bots;
    expect(bot.bot?.thinkAt).toBeGreaterThanOrEqual(
      thinkIntervalSec * handicap.thinkSlowdown * 0.5,
    );
  });
});

describe("a bot below its cap", () => {
  test("only takes what fits under the cap from a slain mage", () => {
    const bench = createBench();
    const bot = botArmy(bench);
    fill(bench, bot, 30);
    const victim = botArmy(bench, 150, 150, "Victim");
    fill(bench, victim, 40);
    updateHandicaps(bench.world);
    killMage(bench.world, victim, bot);
    expect(bot.units.size + bot.corpses.size).toBeLessThanOrEqual(
      botCap(bench.world),
    );
    expect(bot.units.size + bot.corpses.size).toBeGreaterThan(30);
  });
});
