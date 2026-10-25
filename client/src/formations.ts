import type { ClientConfig } from "@horde/shared";

export const formationForKey = (
  key: string,
  keys: string[],
): number | undefined => {
  const index = keys.indexOf(key.toLowerCase());
  return index < 0 ? undefined : index;
};

export class FormationBar {
  readonly element = document.createElement("div");
  #buttons: HTMLButtonElement[] = [];

  constructor(
    root: HTMLElement,
    readonly config: () => ClientConfig,
    readonly choose: (index: number) => void,
  ) {
    this.element.className = "formations";
    root.append(this.element);
    this.build();
    window.addEventListener("keydown", (event) => {
      if (event.repeat) {
        return;
      }
      const index = formationForKey(
        event.key,
        this.config().client.formationKeys,
      );
      if (index !== undefined && index < this.#buttons.length) {
        this.choose(index);
      }
    });
  }

  build(): void {
    const { content, client } = this.config();
    this.#buttons = content.formations.map((formation, index) => {
      const button = document.createElement("button");
      button.type = "button";
      const key = client.formationKeys[index];
      button.textContent =
        key === undefined ? formation.name : `${formation.name} [${key}]`;
      button.addEventListener("click", () => {
        this.choose(index);
      });
      return button;
    });
    this.element.replaceChildren(...this.#buttons);
  }

  setStatus(formation: number, next: number, progress: number): void {
    this.#buttons.forEach((button, index) => {
      button.classList.toggle("active", formation === index + 1);
      const changing = next === index + 1;
      button.classList.toggle("changing", changing);
      button.style.setProperty(
        "--progress",
        `${String(Math.round((changing ? progress : 0) * 100))}%`,
      );
    });
  }
}
