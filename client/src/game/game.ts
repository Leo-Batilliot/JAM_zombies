import {
  Application,
  Container,
  type FederatedPointerEvent,
  type Spritesheet,
} from "pixi.js";
import { ClientMessageType, type SnapshotEntity } from "@horde/shared";
import type { Connection } from "../net/connection.js";
import { EntityLayer, type Rect } from "./entities.js";
import { SnapshotBuffer } from "./interpolation.js";
import { MapLayer } from "./map.js";
import { ClickMarker } from "./marker.js";
import { pickEnemy } from "./picking.js";

const rightButton = 2;

export const startGame = async (
  root: HTMLElement,
  connection: Connection,
  atlas: Spritesheet,
): Promise<void> => {
  const config = () => connection.config;
  const app = new Application();
  await app.init({
    resizeTo: window,
    resolution: Math.min(
      window.devicePixelRatio,
      config().client.maxPixelRatio,
    ),
    autoDensity: true,
    antialias: true,
    background: "#141018",
  });
  root.append(app.canvas);
  app.canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  const world = new Container();
  const map = new MapLayer(atlas.textures);
  map.build(config());
  const entities = new EntityLayer(atlas.textures, connection);
  const marker = new ClickMarker(() => config().client.markerDurationMs);
  world.addChild(map.container, marker.graphics, entities.container);
  app.stage.addChild(world);

  const buffer = new SnapshotBuffer(config().network);
  connection.onSnapshot = (snapshot) => {
    buffer.push(snapshot.tick, snapshot.entities, performance.now());
  };

  const sendView = (): void => {
    const { pixelsPerMeter } = config().client;
    connection.send({
      type: ClientMessageType.View,
      width: app.screen.width / pixelsPerMeter,
      height: app.screen.height / pixelsPerMeter,
    });
  };
  sendView();
  app.renderer.on("resize", sendView);

  let frame: SnapshotEntity[] = [];

  const command = (event: FederatedPointerEvent): void => {
    const { width, height } = config().world;
    const point = world.toLocal(event.global);
    const x = Math.min(Math.max(point.x, 0), width);
    const y = Math.min(Math.max(point.y, 0), height);
    const self = frame.find((entity) => entity.id === connection.mageId);
    const enemy = pickEnemy(
      frame,
      x,
      y,
      config().client.pickRadius,
      self?.army,
    );
    if (enemy === undefined) {
      connection.send({ type: ClientMessageType.Move, x, y });
      marker.show(x, y, performance.now(), false);
    } else {
      connection.send({ type: ClientMessageType.Target, entityId: enemy.id });
      marker.show(enemy.x, enemy.y, performance.now(), true);
    }
  };

  app.stage.eventMode = "static";
  app.stage.hitArea = app.screen;
  app.stage.on("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button === rightButton) {
      command(event);
    }
  });
  app.stage.on("pointertap", (event) => {
    if (event.pointerType !== "mouse") {
      command(event);
    }
  });

  const camera = { x: config().world.width / 2, y: config().world.height / 2 };
  app.ticker.add(() => {
    const now = performance.now();
    const scale = config().client.pixelsPerMeter;
    frame = buffer.sample(now);
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
    entities.update(frame, view, now);
    marker.update(now);
  });
};
