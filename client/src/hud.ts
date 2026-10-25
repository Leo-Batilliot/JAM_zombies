import type { Status } from "@horde/shared";
import { leaderboardRows } from "./leaderboard.js";
import type { Leaderboard } from "./net/connection.js";

export const xpRatio = (status: Status): number => {
  const span = status.nextSouls - status.levelSouls;
  return span > 0
    ? Math.min(Math.max((status.souls - status.levelSouls) / span, 0), 1)
    : 0;
};

export const slowText = (pace: number): string => {
  const percent = Math.round((1 - pace) * 100);
  return percent > 0 ? `Slow -${String(percent)}%` : "";
};

const percent = (ratio: number): string =>
  `${String(Math.round(ratio * 100))}%`;

export class Hud {
  readonly element = document.createElement("div");
  readonly #hpFill: HTMLElement;
  readonly #hpText: HTMLElement;
  readonly #xpFill: HTMLElement;
  readonly #level: HTMLElement;
  readonly #power: HTMLElement;
  readonly #slow: HTMLElement;
  readonly #watch: HTMLElement;
  readonly #rank: HTMLElement;
  readonly #rows: HTMLOListElement;
  #status: Status | undefined;

  constructor(
    root: HTMLElement,
    readonly leaderboardSize: () => number,
  ) {
    this.element.className = "hud";
    this.element.innerHTML = `
      <section class="hud-self">
        <div class="hud-line">
          <span class="hud-level"></span>
          <div class="hud-xp"><div class="hud-xp-fill"></div></div>
        </div>
        <div class="hud-hp"><div class="hud-hp-fill"></div><span></span></div>
        <div class="hud-army">
          <span class="hud-power"></span>
          <span class="hud-slow"></span>
        </div>
        <div class="hud-watch" hidden></div>
      </section>
      <section class="hud-board">
        <div class="hud-rank"></div>
        <ol></ol>
      </section>
    `;
    root.append(this.element);
    const find = (selector: string) =>
      this.element.querySelector(selector) as HTMLElement;
    this.#hpFill = find(".hud-hp-fill");
    this.#hpText = find(".hud-hp span");
    this.#xpFill = find(".hud-xp-fill");
    this.#level = find(".hud-level");
    this.#power = find(".hud-power");
    this.#slow = find(".hud-slow");
    this.#watch = find(".hud-watch");
    this.#rank = find(".hud-rank");
    this.#rows = find(".hud-board ol") as HTMLOListElement;
  }

  setStatus(status: Status): void {
    this.#status = status;
    const ratio = status.maxHp > 0 ? status.hp / status.maxHp : 0;
    this.#hpFill.style.width = percent(ratio);
    this.#hpText.textContent = `${String(status.hp)} / ${String(status.maxHp)}`;
    this.#xpFill.style.width = percent(xpRatio(status));
    this.#level.textContent = `Lv ${String(status.level)}`;
    this.#power.textContent = `${String(status.units)} units · power ${String(status.strength)} / ${String(status.potential)}`;
    this.#slow.textContent = slowText(status.pace);
  }

  setWatching(name: string): void {
    this.element.classList.add("watching");
    this.#watch.hidden = false;
    this.#watch.textContent = name === "" ? "Watching" : `Watching ${name}`;
  }

  setLeaderboard(leaderboard: Leaderboard): void {
    this.#rank.textContent =
      leaderboard.rank === 0
        ? `${String(leaderboard.total)} players`
        : `Rank ${String(leaderboard.rank)} / ${String(leaderboard.total)}`;
    const rows = leaderboardRows(
      leaderboard,
      this.#status?.army,
      this.#status?.strength ?? 0,
      this.leaderboardSize(),
    );
    this.#rows.replaceChildren(
      ...rows.map((row) => {
        const item = document.createElement("li");
        item.className = row.self ? "self" : "";
        const name = document.createElement("span");
        name.textContent = `${String(row.rank)}. ${row.name}`;
        const strength = document.createElement("span");
        strength.textContent = String(row.strength);
        item.append(name, strength);
        return item;
      }),
    );
  }
}
