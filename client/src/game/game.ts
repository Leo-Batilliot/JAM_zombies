import {
  Application,
  Container,
  type FederatedPointerEvent,
  type Spritesheet,
} from "pixi.js";
import {
  ClientMessageType,
  neutralArmy,
  type Bounty,
  type SnapshotEntity,
  type Status,
} from "@horde/shared";
import { CueTracker } from "../audio/cues.js";
import type { AudioEngine } from "../audio/engine.js";
import { Music, musicMix } from "../audio/music.js";
import { DeathScreen } from "../death.js";
import { isDemo, startDemo } from "../demo.js";
import { EventDisplay } from "../events.js";
import { EvolutionPopup, evolutionOptions } from "../evolution.js";
import { FormationBar } from "../formations.js";
import { Hud } from "../hud.js";
import { LootNotice } from "../loot.js";
import { Minimap } from "../minimap.js";
import type { Connection } from "../net/connection.js";
import { RetreatControl } from "../retreat.js";
import { Screamer } from "../screamer.js";
import { BattleLayer } from "./battle.js";
import { CrossLayer } from "./crosses.js";
import { EntityLayer, type Rect } from "./entities.js";
import { SnapshotBuffer } from "./interpolation.js";
import { MapLayer } from "./map.js";
import { ClickMarker } from "./marker.js";
import { MistLayer } from "./mists.js";
import { pickEnemy } from "./picking.js";
import { SearchBar } from "./search.js";

const leftButton = 0;

export const startGame = async (
  root: HTMLElement,
  ui: HTMLElement,
  connection: Connection,
  atlas: Spritesheet,
  audio: AudioEngine,
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
  const battle = new BattleLayer();
  const crosses = new CrossLayer();
  const searchBar = new SearchBar();
  const mists = new MistLayer();
  world.addChild(
    map.container,
    crosses.container,
    battle.container,
    marker.graphics,
    entities.container,
    mists.graphics,
    searchBar.graphics,
  );
  app.stage.addChild(world);

  const hud = new Hud(ui);
  if (isDemo(location.search)) {
    startDemo(ui, connection);
  }
  const retreat = new RetreatControl(ui, () => config().client.retreatKey);
  const minimap = new Minimap(ui);
  const loot = new LootNotice(ui);
  const evolution = new EvolutionPopup(ui, (into) => {
    connection.send({ type: ClientMessageType.Evolve, evolution: into });
  });
  const formations = new FormationBar(ui, config, (formation) => {
    connection.send({ type: ClientMessageType.Formation, formation });
  });
  let bounty: Bounty | undefined;
  connection.onLoot = (item) => {
    const name = config().content.items[item]?.name;
    if (name !== undefined) {
      loot.show(name, config().client.lootMs);
    }
  };
  let status: Status | undefined;
  let exit: { x: number; y: number } | undefined;
  connection.onStatus = (next) => {
    status = next;
    hud.setStatus(next);
    retreat.setBattle(next.battle);
    evolution.update(
      evolutionOptions(next.counts, config().content),
      performance.now(),
      config().client.evolutionCollapseMs,
    );
    formations.setStatus(
      next.formation,
      next.nextFormation,
      next.formationProgress,
    );
  };
  connection.onLeaderboard = (leaderboard) => {
    hud.setLeaderboard(leaderboard);
    bounty = leaderboard.bounty;
  };
  const death = new DeathScreen(ui);
  const screamer = new Screamer(ui, audio);
  const music = new Music(audio);
  const cues = new CueTracker();
  const events = new EventDisplay(ui);
  const eventName = (event: number): string =>
    config().content.events[event]?.name ?? "";
  connection.onEventStarted = (start) => {
    events.start(start, eventName(start.event), config().client.announceMs);
    audio.play("boss", performance.now());
  };
  connection.onEventEnded = (end) => {
    events.end(end, eventName(end.event), config().client.announceMs);
  };
  const configureAudio = (): void => {
    audio.configure(config().client.audio);
    music.configure(config().client.audio);
    screamer.preload(config().client.screamer);
  };
  configureAudio();
  connection.onDied = (killer) => {
    screamer.play(config().client.screamer, () => {
      death.show(killer);
    });
  };

  const buffer = new SnapshotBuffer(config().network);
  connection.onConfig = (next) => {
    buffer.settings = next.network;
    map.build(next);
    retreat.setKey(next.client.retreatKey);
    formations.build();
    configureAudio();
    sendView();
  };
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
    if (retreat.take()) {
      connection.send({ type: ClientMessageType.Retreat, x, y });
      marker.show(x, y, performance.now(), false);
      exit = { x, y };
      return;
    }
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
    if (event.pointerType === "mouse" && event.button === leftButton) {
      command(event);
    }
  });
  app.stage.on("pointertap", (event) => {
    if (event.pointerType !== "mouse") {
      command(event);
    }
  });

  const playCues = (view: Rect, now: number): void => {
    const { fighting, deaths, rises } = cues.read(frame, view);
    if (fighting > 0) {
      audio.play("hit", now);
    }
    if (deaths > 0) {
      audio.play("death", now);
    }
    if (rises > 0) {
      audio.play("rise", now);
    }
    const { combatFullUnits, fadeSec } = config().client.audio;
    music.update(musicMix(fighting, combatFullUnits, events.active), fadeSec);
  };

  const camera = { x: config().world.width / 2, y: config().world.height / 2 };
  app.ticker.add(() => {
    const now = performance.now();
    const scale = config().client.pixelsPerMeter;
    frame = buffer.sample(now);
    const self = frame.find((entity) => entity.id === connection.mageId);
    if (self !== undefined) {
      camera.x = self.x;
      camera.y = self.y;
      death.hide();
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
    battle.update(
      status?.battle ?? 0,
      status?.circles ?? [],
      self,
      exit,
      now,
      config().client.aggroPulseMs,
    );
    crosses.update(frame, status?.crosses ?? [], config().world.crosses, scale);
    searchBar.update(status?.search ?? 0, self);
    mists.update(frame, config());
    minimap.draw(
      config().client.minimapSize,
      config().world,
      self,
      events.positions,
      bounty === undefined ||
        bounty.army === neutralArmy ||
        bounty.army === status?.army
        ? undefined
        : bounty,
    );
    marker.update(now);
    playCues(view, now);
    events.update({
      cameraX: camera.x,
      cameraY: camera.y,
      scale,
      width: app.screen.width,
      height: app.screen.height,
      margin: config().client.arrowMargin,
    });
  });
};
