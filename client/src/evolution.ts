import type { ClientConfig, UnitCount } from "@horde/shared";

export interface EvolutionChoice {
  into: string;
  name: string;
  from: string;
  cost: number;
}

export const availableEvolutions = (
  counts: UnitCount[],
  content: ClientConfig["content"],
): EvolutionChoice[] =>
  counts.flatMap(({ type, count }) => {
    const unit = content.units[type];
    if (unit === undefined) {
      return [];
    }
    return unit.evolutions
      .filter((evolution) => evolution.cost <= count)
      .map((evolution) => ({
        into: evolution.into,
        name:
          content.units.find((entry) => entry.id === evolution.into)?.name ??
          evolution.into,
        from: unit.name,
        cost: evolution.cost,
      }));
  });

export class EvolutionPopup {
  readonly element = document.createElement("div");
  #shown = "";

  constructor(
    root: HTMLElement,
    readonly choose: (into: string) => void,
  ) {
    this.element.className = "evolution";
    this.element.hidden = true;
    root.append(this.element);
  }

  update(choices: EvolutionChoice[]): void {
    const key = choices
      .map((choice) => `${choice.into}:${String(choice.cost)}`)
      .join("|");
    if (key === this.#shown) {
      return;
    }
    this.#shown = key;
    this.element.hidden = choices.length === 0;
    this.element.replaceChildren(
      ...choices.map((choice) => {
        const button = document.createElement("button");
        button.type = "button";
        const name = document.createElement("strong");
        name.textContent = `Evolve: ${choice.name}`;
        const cost = document.createElement("span");
        cost.textContent = `${String(choice.cost)} × ${choice.from}`;
        button.append(name, cost);
        button.addEventListener("click", () => {
          this.choose(choice.into);
        });
        return button;
      }),
    );
  }
}
