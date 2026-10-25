import { describe, expect, test } from "vitest";
import { CardKind, type ClientConfig } from "@horde/shared";
import { cardLabel } from "../src/cards.js";
import { statLines } from "../src/death.js";
import { spellLabel } from "../src/spell.js";

const content = {
  units: [
    { id: "zombie", name: "Zombie", strength: 1 },
    { id: "ghoul", name: "Ghoul", strength: 2 },
  ],
  gifts: [{ id: "haste", name: "Haste" }],
  spells: [{ id: "bone-wall", name: "Bone wall" }],
} as unknown as ClientConfig["content"];

describe("level up cards", () => {
  test("name the mutation, gift or spell", () => {
    expect(cardLabel({ kind: CardKind.Mutation, index: 1 }, content)).toEqual({
      title: "Ghoul",
      kind: "Mutation",
    });
    expect(cardLabel({ kind: CardKind.Gift, index: 0 }, content).title).toBe(
      "Haste",
    );
    expect(cardLabel({ kind: CardKind.Spell, index: 0 }, content).kind).toBe(
      "Spell",
    );
  });

  test("the spell button shows its key", () => {
    expect(spellLabel(1, " ", content)).toBe("Bone wall [Space]");
    expect(spellLabel(1, "q", content)).toBe("Bone wall [Q]");
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
