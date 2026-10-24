import { describe, expect, test } from "vitest";
import { EntityKind } from "@horde/shared";
import {
  animationFrames,
  armyColor,
  frameAt,
  spriteName,
} from "../src/game/sprites.js";

const textures = {
  "unit-zombie-walk-0": "w0",
  "unit-zombie-walk-1": "w1",
  "unit-zombie-walk-3": "w3",
  corpse: "still",
};

describe("animationFrames", () => {
  test("collects consecutive frames", () => {
    expect(animationFrames(textures, "unit-zombie", "walk")).toEqual([
      "w0",
      "w1",
    ]);
  });

  test("falls back on the still sprite", () => {
    expect(animationFrames(textures, "corpse", "walk")).toEqual(["still"]);
  });

  test("is empty for an unknown sprite", () => {
    expect(animationFrames(textures, "unit-ghost", "walk")).toEqual([]);
  });
});

describe("frameAt", () => {
  test("loops over the frames", () => {
    expect(frameAt(["a", "b"], 0, 100)).toBe("a");
    expect(frameAt(["a", "b"], 150, 100)).toBe("b");
    expect(frameAt(["a", "b"], 250, 100)).toBe("a");
  });
});

describe("spriteName", () => {
  const content = { units: ["zombie", "fat-zombie"], npcs: ["civilian"] };
  const entity = { id: 1, type: 1, army: 1, flags: 0, x: 0, y: 0 };

  test("names units after their type", () => {
    expect(spriteName({ ...entity, kind: EntityKind.Unit }, content)).toBe(
      "unit-fat-zombie",
    );
  });

  test("names npcs after their type", () => {
    expect(
      spriteName({ ...entity, type: 0, kind: EntityKind.Npc }, content),
    ).toBe("npc-civilian");
  });

  test("names the mage", () => {
    expect(spriteName({ ...entity, kind: EntityKind.Mage }, content)).toBe(
      "mage",
    );
  });
});

describe("armyColor", () => {
  test("cycles through the palette by army slot", () => {
    const colors = ["#ff0000", "#00ff00"];
    expect(armyColor(colors, 1)).toBe(0xff0000);
    expect(armyColor(colors, 2)).toBe(0x00ff00);
    expect(armyColor(colors, 3)).toBe(0xff0000);
  });
});
