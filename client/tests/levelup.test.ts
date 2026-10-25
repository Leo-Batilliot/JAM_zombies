import { describe, expect, test } from "vitest";
import { CardKind, type ClientConfig } from "@horde/shared";
import { artScale, cardView } from "../src/cards.js";
import { statLines } from "../src/death.js";
import { spellLabel } from "../src/spell.js";

const unit = (id: string, name: string, strength: number) => ({
  id,
  name,
  strength,
  hp: 30 * strength,
  damage: 5 * strength,
  attackIntervalSec: 1,
  speed: 7,
  attackRange: 0.3,
});

const content = {
  units: [
    unit("zombie", "Zombie", 1),
    unit("ghoul", "Ghoul", 2),
    unit("stalker", "Stalker", 4),
    { ...unit("archer", "Archer", 1), attackRange: 7 },
  ],
  lineages: [
    {
      id: "zombie",
      name: "Zombies",
      base: "zombie",
      branches: { speed: { name: "Speed", tiers: ["ghoul", "stalker"] } },
    },
  ],
  gifts: [
    { id: "haste", name: "Haste", effect: "speed", value: 0.08, maxStacks: 3 },
  ],
  spells: [
    {
      id: "nova",
      name: "Necrotic nova",
      effect: "nova",
      cooldownSec: 20,
      radius: 6,
      damage: 40,
    },
  ],
} as unknown as ClientConfig["content"];

describe("level up cards", () => {
  test("a mutation card shows its place, its stats and its sprite", () => {
    const view = cardView({ kind: CardKind.Mutation, index: 1 }, content);
    expect(view.title).toBe("Ghoul");
    expect(view.kind).toBe("Mutation");
    expect(view.subtitle).toBe("Zombies · Speed · Tier 1");
    expect(view.stats).toContainEqual(["HP", "60"]);
    expect(view.stats).toContainEqual(["DPS", "10"]);
    expect(view.stats).toContainEqual(["Range", "Melee"]);
    expect(view.stats).toContainEqual(["Worth", "2 units"]);
    expect(view.description).toContain("Closes the other branch");
    expect(view.sprite).toBe("unit-ghoul");
    expect(
      cardView({ kind: CardKind.Mutation, index: 2 }, content).subtitle,
    ).toBe("Zombies · Speed · Tier 2");
  });

  test("a ranged unit shows its range in meters", () => {
    expect(
      cardView({ kind: CardKind.Mutation, index: 3 }, content).stats,
    ).toContainEqual(["Range", "7 m"]);
  });

  test("gift and spell cards describe their effect with an icon", () => {
    const gift = cardView({ kind: CardKind.Gift, index: 0 }, content);
    expect(gift.description).toBe("The mage walks 8% faster.");
    expect(gift.sprite).toBe("icon-gift-speed");
    const spell = cardView({ kind: CardKind.Spell, index: 0 }, content);
    expect(spell.description).toContain("40 damage around the mage within 6 m");
    expect(spell.stats).toContainEqual(["Cooldown", "20 s"]);
    expect(spell.sprite).toBe("icon-spell-nova");
  });

  test("art fits its box without growing past the configured scale", () => {
    const art = {
      url: "atlas.png",
      x: 0,
      y: 0,
      width: 24,
      height: 24,
      sheetWidth: 512,
      sheetHeight: 512,
    };
    expect(artScale(art, 48, 3)).toBe(2);
    expect(artScale({ ...art, width: 12, height: 12 }, 48, 2)).toBe(2);
  });

  test("the spell button shows its key", () => {
    expect(spellLabel(1, " ", content)).toBe("Necrotic nova [Space]");
    expect(spellLabel(1, "q", content)).toBe("Necrotic nova [Q]");
  });
});

describe("run summary", () => {
  test("lists the stats of the life with the chosen mutations", () => {
    const lines = statLines(
      {
        maxPower: 42,
        survivalSec: 125,
        infected: 9,
        kills: 30,
        mageKills: 1,
        level: 4,
        mutations: [1],
      },
      content,
    );
    expect(lines).toContainEqual(["Survived", "2:05"]);
    expect(lines).toContainEqual(["Mutations", "Ghoul"]);
    expect(lines).toContainEqual(["Max power", "42"]);
  });
});
