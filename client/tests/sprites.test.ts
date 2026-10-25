import { describe, expect, test } from "vitest";
import { EntityKind, levelFlags } from "@horde/shared";
import {
  animationFrames,
  armyColor,
  gearName,
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
  const content = {
    units: [
      { id: "zombie", name: "Zombie", evolutions: [] },
      { id: "fat-zombie", name: "Fat zombie", evolutions: [] },
    ],
    items: [],
    npcs: ["civilian"],
    pointsOfInterest: ["mass-grave"],
    events: [],
  };
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

  test("names points of interest after their type", () => {
    expect(
      spriteName(
        { ...entity, type: 0, kind: EntityKind.PointOfInterest },
        content,
      ),
    ).toBe("poi-mass-grave");
  });

  test("names the mage", () => {
    expect(spriteName({ ...entity, kind: EntityKind.Mage }, content)).toBe(
      "mage",
    );
  });
});

describe("gearName", () => {
  const content = {
    units: [
      { id: "zombie", name: "Zombie", equipment: "melee", evolutions: [] },
      { id: "archer", name: "Archer", equipment: "helmet", evolutions: [] },
    ],
    items: [
      { id: "shovel", name: "Shovel", category: "melee" },
      { id: "cap", name: "Cap", category: "helmet" },
      { id: "bat", name: "Bat", category: "melee" },
    ],
    npcs: [],
    pointsOfInterest: [],
    events: [],
  };
  const unit = { id: 1, kind: EntityKind.Unit, army: 1, x: 0, y: 0 };

  test("finds the item from its slot in the unit category", () => {
    expect(gearName({ ...unit, type: 0, flags: levelFlags(2) }, content)).toBe(
      "item-bat",
    );
    expect(gearName({ ...unit, type: 1, flags: levelFlags(1) }, content)).toBe(
      "item-cap",
    );
  });

  test("gives nothing without an item", () => {
    expect(gearName({ ...unit, type: 0, flags: 0 }, content)).toBeUndefined();
    expect(
      gearName({ ...unit, type: 0, flags: levelFlags(3) }, content),
    ).toBeUndefined();
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
