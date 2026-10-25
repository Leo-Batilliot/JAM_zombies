import {
  Application,
  Container,
  type FederatedPointerEvent,
  type Spritesheet,
} from "pixi.js";
import {
  BattleFlag,
  ClientMessageType,
  neutralArmy,
  spectatorMageId,
  type Bounty,
  type SnapshotEntity,
  type Status,
} from "@horde/shared";
import { CueTracker } from "../audio/cues.js";
import { BossBar } from "../bossbar.js";
import type { AudioEngine } from "../audio/engine.js";
import { Music, musicMix } from "../audio/music.js";
import { DeathScreen } from "../death.js";
import { isDemo, startDemo } from "../demo.js";
import { EventDisplay } from "../events.js";
import { CardPanel } from "../cards.js";
import { FormationBar } from "../formations.js";
import { Hud } from "../hud.js";
import { LootNotice } from "../loot.js";
import { Minimap } from "../minimap.js";
import type { Connection } from "../net/connection.js";
import { Screamer } from "../screamer.js";
import { SpellButton } from "../spell.js";
import { BombingLayer } from "./bombings.js";
import { easeZoom, zoomFor } from "./camera.js";
import { CrossLayer } from "./crosses.js";
import { EntityLayer, type Rect } from "./entities.js";
import { SnapshotBuffer } from "./interpolation.js";
import { MapLayer } from "./map.js";
import { ClickMarker } from "./marker.js";
import { MistLayer } from "./mists.js";
import { buildOutlines } from "./outlines.js";
import { pickEnemy } from "./picking.js";
import { armyHex } from "./sprites.js";
import { PlateLayer } from "./plates.js";
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
  const { spectating } = connection;
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
  const entities = new EntityLayer(
    atlas.textures,
    connection,
    buildOutlines(atlas.textures),
  );
  const plates = new PlateLayer();
  const marker = new ClickMarker(() => config().client.markerDurationMs);
  const crosses = new CrossLayer();
  const searchBar = new SearchBar();
  const mists = new MistLayer();
  const bombings = new BombingLayer();
  world.addChild(
    map.container,
    crosses.container,
    bombings.graphics,
    marker.graphics,
    entities.container,
    plates.container,
    mists.graphics,
    searchBar.graphics,
  );
  app.stage.addChild(world);

  const hud = new Hud(ui, () => config().gameplay.leaderboardSize);
  const bossBar = new BossBar(ui);
  if (isDemo(location.search) && !spectating) {
    startDemo(ui, connection);
  }
  const minimap = new Minimap(ui);
  const controls = spectating
    ? undefined
    : {
        loot: new LootNotice(ui),
        cards: new CardPanel(ui, (card) => {
          connection.send({ type: ClientMessageType.Choose, card });
        }),
        spell: new SpellButton(
          ui,
          () => config().client.spellKey,
          () => {
            connection.send({ type: ClientMessageType.Cast });
          },
        ),
        formations: new FormationBar(ui, config, (formation) => {
          connection.send({ type: ClientMessageType.Formation, formation });
        }),
      };
  let bounty: Bounty | undefined;
  let focusId: number | undefined;
  connection.onFocus = (focus) => {
    focusId = focus.mageId === spectatorMageId ? undefined : focus.mageId;
    hud.setWatching(focus.name);
  };
  if (connection.focus !== undefined) {
    connection.onFocus(connection.focus);
  }
  connection.onLoot = (item) => {
    const name = config().content.items[item]?.name;
    if (name !== undefined) {
      controls?.loot.show(name, config().client.lootMs);
    }
  };
  const eventName = (event: number): string =>
    config().content.events[event]?.name ?? "";
  let status: Status | undefined;
  connection.onStatus = (next) => {
    status = next;
    hud.setStatus(next);
    bossBar.update(next.bosses, eventName);
    controls?.cards.update(
      next.cards,
      (next.battle & BattleFlag.InBattle) !== 0,
      config().content,
    );
    controls?.spell.update(next.spell, next.spellCooldown, config().content);
    controls?.formations.setStatus(next.formation, next.formationCooldown);
  };
  connection.onLeaderboard = (leaderboard) => {
    hud.setLeaderboard(leaderboard);
    plates.setEntries(leaderboard.entries);
    bounty = leaderboard.bounty;
  };
  const death = new DeathScreen(ui, () => {
    connection.send({ type: ClientMessageType.Respawn });
  });
  const screamer = new Screamer(ui, audio);
  const music = new Music(audio);
  const cues = new CueTracker();
  const events = new EventDisplay(ui);
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
  connection.onDied = (killer, stats) => {
    screamer.play(config().client.screamer, () => {
      death.show(killer, stats, config().content);
    });
  };

  const buffer = new SnapshotBuffer(config().network);
  connection.onConfig = (next) => {
    buffer.settings = next.network;
    map.build(next);
    controls?.formations.build();
    configureAudio();
    sendView();
  };
  connection.onSnapshot = (snapshot) => {
    buffer.push(snapshot.tick, snapshot.entities, performance.now());
  };

  let zoom = 1;
  let sentZoom = zoom;
  const sendView = (): void => {
    const scale = config().client.pixelsPerMeter * zoom;
    sentZoom = zoom;
    connection.send({
      type: ClientMessageType.View,
      width: app.screen.width / scale,
      height: app.screen.height / scale,
    });
  };
  sendView();
  app.renderer.on("resize", sendView);

  let frame: SnapshotEntity[] = [];

  const command = (event: FederatedPointerEvent): void => {
    if (controls === undefined) {
      return;
    }
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
    const { fighting, deaths, rises, blasts } = cues.read(frame, view);
    if (fighting > 0) {
      audio.play("hit", now);
    }
    if (deaths > 0) {
      audio.play("death", now);
    }
    if (rises > 0) {
      audio.play("rise", now);
    }
    if (blasts > 0) {
      audio.play("blast", now);
    }
    const { combatFullUnits, fadeSec } = config().client.audio;
    music.update(musicMix(fighting, combatFullUnits, events.active), fadeSec);
  };

  const camera = { x: config().world.width / 2, y: config().world.height / 2 };
  app.ticker.add(() => {
    const now = performance.now();
    const { camera: cameraSettings, pixelsPerMeter } = config().client;
    zoom = easeZoom(
      zoom,
      zoomFor(status?.strength ?? 0, cameraSettings) / (status?.vision ?? 1),
      cameraSettings,
    );
    if (Math.abs(zoom - sentZoom) > sentZoom * cameraSettings.resendRatio) {
      sendView();
    }
    const scale = pixelsPerMeter * zoom;
    frame = buffer.sample(now);
    const self = frame.find((entity) => entity.id === connection.mageId);
    const followed = spectating
      ? frame.find((entity) => entity.id === focusId)
      : self;
    if (followed !== undefined) {
      camera.x = followed.x;
      camera.y = followed.y;
    }
    if (self !== undefined) {
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
    entities.update(frame, view, now, self?.army);
    plates.update(frame, self?.army, config());
    crosses.update(frame, status?.crosses ?? [], config().world.crosses, scale);
    searchBar.update(status?.search ?? 0, self);
    mists.update(frame, config());
    bombings.update(frame, config());
    minimap.draw(
      config().client.minimapSize,
      config().world,
      followed,
      events.positions,
      bounty === undefined ||
        bounty.army === neutralArmy ||
        bounty.army === status?.army
        ? undefined
        : bounty,
      (status?.mages ?? []).map((mage) => ({
        x: mage.x,
        y: mage.y,
        color: armyHex(config().client.armyColors, mage.army),
      })),
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
