import type { ClientConfig, RunStats } from "@horde/shared";

export const statLines = (
  stats: RunStats,
  content: ClientConfig["content"],
): [string, string][] => {
  const minutes = Math.floor(stats.survivalSec / 60);
  const seconds = stats.survivalSec % 60;
  const mutations = stats.mutations
    .map((index) => content.units[index]?.name ?? "")
    .filter((name) => name !== "");
  return [
    ["Max power", String(stats.maxPower)],
    ["Survived", `${String(minutes)}:${String(seconds).padStart(2, "0")}`],
    ["Civilians infected", String(stats.infected)],
    ["Units killed", String(stats.kills)],
    ["Mages killed", String(stats.mageKills)],
    ["Level reached", String(stats.level)],
    ["Mutations", mutations.length === 0 ? "None" : mutations.join(", ")],
  ];
};

export class DeathScreen {
  readonly element = document.createElement("div");
  readonly #title = document.createElement("h2");
  readonly #stats = document.createElement("dl");
  readonly #again = document.createElement("button");

  constructor(
    root: HTMLElement,
    readonly respawn: () => void,
  ) {
    this.element.className = "death";
    this.element.hidden = true;
    this.#again.type = "button";
    this.#again.textContent = "Play again";
    this.#again.addEventListener("click", () => {
      this.#again.disabled = true;
      this.respawn();
    });
    this.element.append(this.#title, this.#stats, this.#again);
    root.append(this.element);
  }

  show(
    killer: string,
    stats: RunStats,
    content: ClientConfig["content"],
  ): void {
    this.#title.textContent =
      killer === "" ? "You were devoured" : `You were devoured by ${killer}`;
    this.#stats.replaceChildren(
      ...statLines(stats, content).flatMap(([label, value]) => {
        const term = document.createElement("dt");
        term.textContent = label;
        const detail = document.createElement("dd");
        detail.textContent = value;
        return [term, detail];
      }),
    );
    this.#again.disabled = false;
    this.element.hidden = false;
  }

  hide(): void {
    this.element.hidden = true;
  }
}
