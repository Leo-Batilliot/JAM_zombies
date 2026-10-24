import type { AudioEngine, AudioSettings } from "./engine.js";

export type MusicLayer = keyof AudioSettings["music"];
export type MusicMix = Record<MusicLayer, number>;

const layers: MusicLayer[] = ["exploration", "combat", "boss"];
const gainEpsilon = 0.01;
const timeConstantsPerFade = 3;

export const musicMix = (
  fighting: number,
  combatFullUnits: number,
  bossActive: boolean,
): MusicMix => ({
  exploration: bossActive ? 0 : 1,
  combat: Math.min(fighting / combatFullUnits, 1),
  boss: bossActive ? 1 : 0,
});

interface Track {
  source: AudioBufferSourceNode;
  gain: GainNode;
  target: number;
}

export class Music {
  #tracks: Map<MusicLayer, Track> | undefined;
  #key = "";

  constructor(readonly engine: AudioEngine) {}

  configure(settings: AudioSettings): void {
    const key = JSON.stringify(settings.music);
    if (key === this.#key) {
      return;
    }
    this.#key = key;
    this.#stop();
    void this.#start(settings.music, key);
  }

  async #start(urls: AudioSettings["music"], key: string): Promise<void> {
    const buffers = await Promise.all(
      layers.map((layer) => this.engine.buffer(urls[layer])),
    );
    const buses = this.engine.buses;
    if (buses === undefined || key !== this.#key) {
      return;
    }
    const startAt = buses.context.currentTime;
    const tracks = new Map<MusicLayer, Track>();
    layers.forEach((layer, index) => {
      const buffer = buffers[index];
      if (buffer === undefined) {
        return;
      }
      const source = buses.context.createBufferSource();
      const gain = buses.context.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = 0;
      source.connect(gain).connect(buses.music);
      source.start(startAt);
      tracks.set(layer, { source, gain, target: 0 });
    });
    this.#tracks = tracks;
  }

  #stop(): void {
    for (const track of this.#tracks?.values() ?? []) {
      track.source.stop();
      track.source.disconnect();
    }
    this.#tracks = undefined;
  }

  update(mix: MusicMix, fadeSec: number): void {
    const context = this.engine.buses?.context;
    if (context === undefined || this.#tracks === undefined) {
      return;
    }
    for (const [layer, track] of this.#tracks) {
      const target = mix[layer];
      if (Math.abs(target - track.target) < gainEpsilon) {
        continue;
      }
      track.target = target;
      track.gain.gain.setTargetAtTime(
        target,
        context.currentTime,
        fadeSec / timeConstantsPerFade,
      );
    }
  }
}
