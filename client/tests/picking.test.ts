import { describe, expect, test } from "vitest";
import { EntityKind, neutralArmy } from "@horde/shared";
import { pickEnemy } from "../src/game/picking.js";

const entity = (id: number, kind: EntityKind, army: number, x: number) => ({
  id,
  kind,
  type: 0,
  army,
  flags: 0,
  x,
  y: 0,
});

const entities = [
  entity(1, EntityKind.Unit, 1, 0),
  entity(2, EntityKind.Unit, 2, 0.8),
  entity(3, EntityKind.Npc, neutralArmy, 0.5),
  entity(4, EntityKind.Corpse, 2, 0.1),
];

describe("pickEnemy", () => {
  test("picks the closest enemy within the radius", () => {
    expect(pickEnemy(entities, 0.4, 0, 1, 1)?.id).toBe(3);
  });

  test("never picks its own army or a corpse", () => {
    expect(pickEnemy(entities, 0, 0, 0.3, 1)).toBeUndefined();
  });

  test("picks an enemy mage but never its own", () => {
    const mages = [
      entity(5, EntityKind.Mage, 1, 0),
      entity(6, EntityKind.Mage, 3, 0.2),
    ];
    expect(pickEnemy(mages, 0, 0, 1, 1)?.id).toBe(6);
    expect(pickEnemy(mages, 0, 0, 1, 3)?.id).toBe(5);
  });

  test("ignores entities outside the radius", () => {
    expect(pickEnemy(entities, 5, 0, 1, 1)).toBeUndefined();
  });
});
