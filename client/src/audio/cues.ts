import { EntityFlag, EntityKind, type SnapshotEntity } from "@horde/shared";
import { isBlast } from "../game/bombings.js";
import type { Rect } from "../game/entities.js";

export interface Cues {
  fighting: number;
  deaths: number;
  rises: number;
  blasts: number;
}

const bodyKinds = new Set([EntityKind.Mage, EntityKind.Unit, EntityKind.Npc]);

const inside = (entity: SnapshotEntity, view: Rect): boolean =>
  entity.x >= view.minX &&
  entity.x <= view.maxX &&
  entity.y >= view.minY &&
  entity.y <= view.maxY;

export class CueTracker {
  #bodies = new Set<number>();
  #rising = new Set<number>();
  #blasted = new Set<number>();

  read(entities: SnapshotEntity[], view: Rect): Cues {
    const present = new Set<number>();
    const bodies = new Set<number>();
    const rising = new Set<number>();
    const blasted = new Set<number>();
    const cues: Cues = { fighting: 0, deaths: 0, rises: 0, blasts: 0 };
    for (const entity of entities) {
      present.add(entity.id);
      if (entity.kind === EntityKind.Bombing && isBlast(entity.flags)) {
        blasted.add(entity.id);
        if (!this.#blasted.has(entity.id) && inside(entity, view)) {
          cues.blasts++;
        }
      }
      if (!bodyKinds.has(entity.kind) || !inside(entity, view)) {
        continue;
      }
      bodies.add(entity.id);
      if ((entity.flags & EntityFlag.Fighting) !== 0) {
        cues.fighting++;
      }
      if ((entity.flags & EntityFlag.Rising) !== 0) {
        rising.add(entity.id);
        if (!this.#rising.has(entity.id)) {
          cues.rises++;
        }
      }
    }
    for (const id of this.#bodies) {
      if (!present.has(id)) {
        cues.deaths++;
      }
    }
    this.#bodies = bodies;
    this.#rising = rising;
    this.#blasted = blasted;
    return cues;
  }
}
