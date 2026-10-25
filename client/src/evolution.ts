import type { ClientConfig, UnitCount } from "@horde/shared";

export interface EvolutionOption {
  into: string;
  name: string;
  from: string;
  cost: number;
  count: number;
  available: boolean;
}

export const evolutionOptions = (
  counts: UnitCount[],
  content: ClientConfig["content"],
): EvolutionOption[] =>
  counts.flatMap(({ type, count }) => {
    const unit = content.units[type];
    if (unit === undefined || unit.evolutions.length === 0) {
      return [];
    }
    const threshold = Math.min(...unit.evolutions.map((entry) => entry.cost));
    if (count < threshold) {
      return [];
    }
    return unit.evolutions.map((evolution) => ({
      into: evolution.into,
      name:
        content.units.find((entry) => entry.id === evolution.into)?.name ??
        evolution.into,
      from: unit.name,
      cost: evolution.cost,
      count,
      available: evolution.cost <= count,
    }));
  });

export const newlyAvailable = (
  options: EvolutionOption[],
  known: Set<string>,
): boolean =>
  options.some((option) => option.available && !known.has(option.into));

export class EvolutionPopup {
  readonly element = document.createElement("div");
  #known = new Set<string>();
  #openedAt = -Infinity;
  #collapsed = false;
  #shown = "";
  #options: EvolutionOption[] = [];

  constructor(
    root: HTMLElement,
    readonly choose: (into: string) => void,
  ) {
    this.element.className = "evolution";
    this.element.hidden = true;
    root.append(this.element);
  }

  update(options: EvolutionOption[], now: number, collapseMs: number): void {
    if (newlyAvailable(options, this.#known)) {
      this.#openedAt = now;
    }
    this.#known = new Set(
      options.filter((option) => option.available).map((option) => option.into),
    );
    this.#collapsed = now - this.#openedAt >= collapseMs;
    this.#options = options;
    const key = `${String(this.#collapsed)}|${options
      .map(
        (option) =>
          `${option.into}:${String(option.count)}:${String(option.available)}`,
      )
      .join("|")}`;
    if (key !== this.#shown) {
      this.#shown = key;
      this.#render();
    }
  }

  #render(): void {
    const options = this.#options;
    this.element.hidden = options.length === 0;
    this.element.classList.toggle("collapsed", this.#collapsed);
    if (this.#collapsed) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "evolution-toggle";
      const ready = options.filter((option) => option.available).length;
      toggle.textContent = `Evolutions (${String(ready)})`;
      toggle.addEventListener("click", () => {
        this.#openedAt = performance.now();
        this.#collapsed = false;
        this.#shown = "";
        this.#render();
      });
      this.element.replaceChildren(toggle);
      return;
    }
    this.element.replaceChildren(
      ...options.map((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.disabled = !option.available;
        const name = document.createElement("strong");
        name.textContent = option.available
          ? `Evolve: ${option.name}`
          : option.name;
        const cost = document.createElement("span");
        cost.textContent = option.available
          ? `${String(option.cost)} × ${option.from}`
          : `${String(option.count)}/${String(option.cost)} ${option.from}`;
        button.append(name, cost);
        button.addEventListener("click", () => {
          this.#openedAt = performance.now();
          this.choose(option.into);
        });
        return button;
      }),
    );
  }
}
