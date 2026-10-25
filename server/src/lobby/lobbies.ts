import type { Config } from "@horde/shared";
import type { World } from "../world/world.js";
import { canJoin, canResume, hasPlayers } from "./lobby.js";

export type Starter = (world: World, afterTick: () => void) => () => void;

export class Lobbies {
  readonly #stops = new Map<World, () => void>();
  onTick: (world: World) => void = () => undefined;

  constructor(
    readonly config: Config,
    readonly createWorld: () => World,
    readonly start: Starter,
  ) {
    this.open();
  }

  get worlds(): World[] {
    return [...this.#stops.keys()];
  }

  get main(): World {
    const [main] = this.#stops.keys();
    if (main === undefined) {
      throw new Error("No lobby open");
    }
    return main;
  }

  open(): World {
    const world = this.createWorld();
    this.#stops.set(
      world,
      this.start(world, () => {
        this.onTick(world);
        this.#closeIfIdle(world);
      }),
    );
    if (this.#stops.size > 1) {
      console.info(`Lobby ${String(this.#stops.size)} opened`);
    }
    return world;
  }

  close(world: World): void {
    this.#stops.get(world)?.();
    this.#stops.delete(world);
    console.info(`Lobby closed, ${String(this.#stops.size)} left`);
  }

  place(token: string): World | undefined {
    const worlds = this.worlds;
    return (
      worlds.find((world) => canResume(world, token)) ??
      worlds.find((world) => canJoin(world)) ??
      (worlds.length < this.config.lobby.maxLobbies ? this.open() : undefined)
    );
  }

  #closeIfIdle(world: World): void {
    if (world !== this.main && !hasPlayers(world)) {
      this.close(world);
    }
  }
}
