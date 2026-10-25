import {
  Container,
  Graphics,
  RenderTexture,
  Sprite,
  Texture,
  type Renderer,
} from "pixi.js";
import {
  EntityKind,
  type ClientConfig,
  type SnapshotEntity,
} from "@horde/shared";
import type { Light } from "./decor.js";

type NightSettings = ClientConfig["client"]["night"];

const haloPixels = 128;

const haloTexture = (): Texture => {
  const canvas = document.createElement("canvas");
  canvas.width = haloPixels;
  canvas.height = haloPixels;
  const context = canvas.getContext("2d");
  if (context !== null) {
    const center = haloPixels / 2;
    const gradient = context.createRadialGradient(
      center,
      center,
      0,
      center,
      center,
      center,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.7)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, haloPixels, haloPixels);
  }
  return Texture.from(canvas);
};

export const entityLights = (
  entities: SnapshotEntity[],
  radii: Record<string, number>,
): Light[] => {
  const lights: Light[] = [];
  for (const entity of entities) {
    const radius = radii[EntityKind[entity.kind]];
    if (radius !== undefined) {
      lights.push({ x: entity.x, y: entity.y, radius });
    }
  }
  return lights;
};

export class SlowFrames {
  #slowMs = 0;

  constructor(readonly settings: () => NightSettings) {}

  get degraded(): boolean {
    return this.#slowMs >= this.settings().slowSec * 1000;
  }

  record(fps: number, elapsedMs: number): void {
    if (this.degraded) {
      return;
    }
    this.#slowMs = fps < this.settings().minFps ? this.#slowMs + elapsedMs : 0;
  }
}

export class NightLayer {
  readonly sprite = new Sprite();
  readonly #scene = new Container();
  readonly #veil = new Graphics();
  readonly #halos = new Container();
  readonly #halo = haloTexture();
  #target: RenderTexture | undefined;

  constructor(readonly renderer: Renderer) {
    this.#scene.addChild(this.#veil, this.#halos);
  }

  #resize(width: number, height: number, resolution: number): RenderTexture {
    const pixelWidth = Math.max(1, Math.ceil(width * resolution));
    const pixelHeight = Math.max(1, Math.ceil(height * resolution));
    if (
      this.#target?.width !== pixelWidth ||
      this.#target.height !== pixelHeight
    ) {
      this.#target?.destroy(true);
      this.#target = RenderTexture.create({
        width: pixelWidth,
        height: pixelHeight,
      });
      this.sprite.texture = this.#target;
    }
    return this.#target;
  }

  update(
    settings: NightSettings,
    lights: Light[],
    toScreen: (x: number, y: number) => { x: number; y: number },
    screen: { width: number; height: number },
    metersToPixels: number,
    degraded: boolean,
  ): void {
    this.sprite.visible = !degraded && settings.alpha > 0;
    if (!this.sprite.visible) {
      return;
    }
    const { resolution } = settings;
    const target = this.#resize(screen.width, screen.height, resolution);
    this.sprite.scale.set(1 / resolution);
    this.#veil
      .clear()
      .rect(0, 0, target.width, target.height)
      .fill({ color: settings.color, alpha: settings.alpha });
    const visible = lights.filter((light) => {
      const point = toScreen(light.x, light.y);
      const reach = light.radius * metersToPixels;
      return (
        point.x > -reach &&
        point.y > -reach &&
        point.x < screen.width + reach &&
        point.y < screen.height + reach
      );
    });
    while (this.#halos.children.length < visible.length) {
      const halo = new Sprite(this.#halo);
      halo.anchor.set(0.5);
      halo.blendMode = "erase";
      this.#halos.addChild(halo);
    }
    this.#halos.children.forEach((child, index) => {
      const light = visible[index];
      child.visible = light !== undefined;
      if (light !== undefined) {
        const point = toScreen(light.x, light.y);
        const size = 2 * light.radius * metersToPixels * resolution;
        child.position.set(point.x * resolution, point.y * resolution);
        child.width = size;
        child.height = size;
      }
    });
    this.renderer.render({
      container: this.#scene,
      target,
      clear: true,
    });
  }
}
