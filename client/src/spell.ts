import type { ClientConfig } from "@horde/shared";

export const spellLabel = (
  spell: number,
  key: string,
  content: ClientConfig["content"],
): string => {
  const name = content.spells[spell - 1]?.name ?? "";
  return key.trim() === ""
    ? `${name} [Space]`
    : `${name} [${key.toUpperCase()}]`;
};

export class SpellButton {
  readonly button = document.createElement("button");

  constructor(
    root: HTMLElement,
    readonly key: () => string,
    readonly cast: () => void,
  ) {
    this.button.type = "button";
    this.button.className = "spell";
    this.button.hidden = true;
    this.button.addEventListener("click", () => {
      this.cast();
    });
    root.append(this.button);
    window.addEventListener("keydown", (event) => {
      if (!event.repeat && event.key === this.key() && !this.button.hidden) {
        event.preventDefault();
        this.cast();
      }
    });
  }

  update(
    spell: number,
    cooldown: number,
    content: ClientConfig["content"],
  ): void {
    this.button.hidden = spell === 0;
    if (spell === 0) {
      return;
    }
    const label = spellLabel(spell, this.key(), content);
    if (this.button.textContent !== label) {
      this.button.textContent = label;
    }
    this.button.disabled = cooldown > 0;
    this.button.style.setProperty(
      "--progress",
      `${String(Math.round(cooldown * 100))}%`,
    );
  }
}
