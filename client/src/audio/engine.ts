import type { ClientConfig } from "@horde/shared";

export type AudioSettings = ClientConfig["client"]["audio"];
export type EffectName = keyof AudioSettings["effects"];

export class EffectLimiter {
  readonly #playedAt = new Map<string, number>();

  allow(name: string, gapMs: number, now: number): boolean {
    const last = this.#playedAt.get(name);
    if (last !== undefined && now - last < gapMs) {
      return false;
    }
    this.#playedAt.set(name, now);
    return true;
  }
}

interface Buses {
  context: AudioContext;
  master: GainNode;
  music: GainNode;
  effects: GainNode;
}

export class AudioEngine {
  #buses: Buses | undefined;
  #settings: AudioSettings | undefined;
  readonly #buffers = new Map<string, Promise<AudioBuffer | undefined>>();
  readonly #limiter = new EffectLimiter();

  unlock(): void {
    if (this.#buses !== undefined) {
      void this.#buses.context.resume();
      return;
    }
    const context = new AudioContext();
    const master = context.createGain();
    const music = context.createGain();
    const effects = context.createGain();
    music.connect(master);
    effects.connect(master);
    master.connect(context.destination);
    this.#buses = { context, master, music, effects };
    void context.resume();
    document.addEventListener("visibilitychange", () => {
      void (document.hidden ? context.suspend() : context.resume());
    });
    if (this.#settings !== undefined) {
      this.configure(this.#settings);
    }
  }

  get buses(): Buses | undefined {
    return this.#buses;
  }

  configure(settings: AudioSettings): void {
    this.#settings = settings;
    if (this.#buses === undefined) {
      return;
    }
    this.#buses.master.gain.value = settings.masterVolume;
    this.#buses.music.gain.value = settings.musicVolume;
    this.#buses.effects.gain.value = settings.effectsVolume;
    for (const effect of Object.values(settings.effects)) {
      void this.buffer(effect.url);
    }
  }

  buffer(url: string): Promise<AudioBuffer | undefined> {
    const context = this.#buses?.context;
    if (context === undefined) {
      return Promise.resolve(undefined);
    }
    let buffer = this.#buffers.get(url);
    if (buffer === undefined) {
      buffer = fetch(url)
        .then((response) => response.arrayBuffer())
        .then((data) => context.decodeAudioData(data))
        .catch(() => undefined);
      this.#buffers.set(url, buffer);
    }
    return buffer;
  }

  play(name: EffectName, now: number): void {
    const effect = this.#settings?.effects[name];
    const buses = this.#buses;
    if (
      effect === undefined ||
      buses === undefined ||
      !this.#limiter.allow(name, effect.gapMs, now)
    ) {
      return;
    }
    void this.buffer(effect.url).then((buffer) => {
      if (buffer === undefined) {
        return;
      }
      const source = buses.context.createBufferSource();
      const gain = buses.context.createGain();
      source.buffer = buffer;
      gain.gain.value = effect.volume;
      source.connect(gain).connect(buses.effects);
      source.start();
    });
  }
}
