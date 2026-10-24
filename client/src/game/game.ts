import {
  Application,
  Container,
  TilingSprite,
  type FederatedPointerEvent,
  type Spritesheet,
  type Texture,
} from "pixi.js";
import { ClientMessageType, EntityKind } from "@horde/shared";
import type { Connection } from "../net/connection.js";
import { EntityLayer, type Rect } from "./entities.js";
import { SnapshotBuffer } from "./interpolation.js";
import { ClickMarker } from "./marker.js";

const rightButton = 2;

const getTexture = (atlas: Spritesheet, name: string): Texture => {
  const texture = atlas.textures[name];
  if (texture === undefined) {
    throw new Error(`Missing sprite ${name}`);
  }
  return texture;
};

export const startGame = async (
  root: HTMLElement,
  connection: Connection,
  atlas: Spritesheet,
): Promise<void> => {
  const { config } = connection;
  const app = new Application();
  await app.init({
    resizeTo: window,
    resolution: Math.min(window.devicePixelRatio, config.client.maxPixelRatio),
    autoDensity: true,
    antialias: true,
    background: "#141018",
  });
  root.append(app.canvas);
  app.canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  const world = new Container();
  const ground = new TilingSprite({
    texture: getTexture(atlas, "ground"),
    width: config.world.width * config.client.pixelsPerMeter,
    height: config.world.height * config.client.pixelsPerMeter,
  });
  ground.scale.set(1 / config.client.pixelsPerMeter);
  const entities = new EntityLayer(
    { [EntityKind.Mage]: getTexture(atlas, "mage") },
    () => config.client.pixelsPerMeter,
  );
  const marker = new ClickMarker(() => config.client.markerDurationMs);
  world.addChild(ground, marker.graphics, entities.container);
  app.stage.addChild(world);

  const buffer = new SnapshotBuffer(config.network);
  connection.onSnapshot = (snapshot) => {
    buffer.push(snapshot.tick, snapshot.entities, performance.now());
  };

  const sendView = (): void => {
    connection.send({
      type: ClientMessageType.View,
      width: app.screen.width / config.client.pixelsPerMeter,
      height: app.screen.height / config.client.pixelsPerMeter,
    });
  };
  sendView();
  app.renderer.on("resize", sendView);

  const moveTo = (event: FederatedPointerEvent): void => {
    const point = world.toLocal(event.global);
    const x = Math.min(Math.max(point.x, 0), config.world.width);
    const y = Math.min(Math.max(point.y, 0), config.world.height);
    connection.send({ type: ClientMessageType.Move, x, y });
    marker.show(x, y, performance.now());
  };

  app.stage.eventMode = "static";
  app.stage.hitArea = app.screen;
  app.stage.on("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button === rightButton) {
      moveTo(event);
    }
  });
  app.stage.on("pointertap", (event) => {
    if (event.pointerType !== "mouse") {
      moveTo(event);
    }
  });

  const camera = { x: config.world.width / 2, y: config.world.height / 2 };
  app.ticker.add(() => {
    const now = performance.now();
    const scale = config.client.pixelsPerMeter;
    const frame = buffer.sample(now);
    const self = frame.find((entity) => entity.id === connection.mageId);
    if (self !== undefined) {
      camera.x = self.x;
      camera.y = self.y;
    }
    world.scale.set(scale);
    world.position.set(
      app.screen.width / 2 - camera.x * scale,
      app.screen.height / 2 - camera.y * scale,
    );
    const halfWidth = app.screen.width / scale / 2;
    const halfHeight = app.screen.height / scale / 2;
    const view: Rect = {
      minX: camera.x - halfWidth,
      minY: camera.y - halfHeight,
      maxX: camera.x + halfWidth,
      maxY: camera.y + halfHeight,
    };
    entities.update(frame, view);
    marker.update(now);
  });
};
