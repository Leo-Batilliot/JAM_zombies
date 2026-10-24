import type { ClientConfig } from "@horde/shared";
import type { AudioEngine } from "./audio/engine.js";

type ScreamerSettings = ClientConfig["client"]["screamer"];

export class Screamer {
  readonly element = document.createElement("div");
  readonly #face = document.createElement("img");

  constructor(
    root: HTMLElement,
    readonly audio: AudioEngine,
  ) {
    this.element.className = "screamer";
    this.element.hidden = true;
    this.#face.alt = "";
    this.element.append(this.#face);
    root.append(this.element);
  }

  preload(settings: ScreamerSettings): void {
    this.#face.src = settings.image;
  }

  play(settings: ScreamerSettings, onDone: () => void): void {
    this.preload(settings);
    this.element.hidden = false;
    this.audio.play("scream", performance.now());
    if ("vibrate" in navigator) {
      navigator.vibrate(settings.vibrateMs);
    }
    setTimeout(() => {
      this.element.hidden = true;
      onDone();
    }, settings.durationMs);
  }
}
