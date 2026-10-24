import { BattleFlag } from "@horde/shared";

export const canRetreat = (battle: number): boolean =>
  (battle & BattleFlag.InBattle) !== 0 && (battle & BattleFlag.Encircled) === 0;

export class RetreatControl {
  readonly button = document.createElement("button");
  readonly hint = document.createElement("div");
  #available = false;
  #aiming = false;

  constructor(root: HTMLElement, key: () => string) {
    this.button.type = "button";
    this.button.className = "retreat";
    this.button.disabled = true;
    this.button.addEventListener("click", () => {
      this.toggle();
    });
    this.hint.className = "retreat-hint";
    this.hint.textContent = "Tap where to flee";
    this.hint.hidden = true;
    root.append(this.button, this.hint);
    this.setKey(key());
    window.addEventListener("keydown", (event) => {
      if (!event.repeat && event.key.toLowerCase() === key()) {
        this.toggle();
      }
    });
  }

  setKey(key: string): void {
    this.button.textContent = `Retreat [${key.toUpperCase()}]`;
  }

  setBattle(battle: number): void {
    this.#available = canRetreat(battle);
    this.button.disabled = !this.#available;
    this.button.classList.toggle(
      "active",
      (battle & BattleFlag.Retreating) !== 0,
    );
    if (!this.#available) {
      this.#setAiming(false);
    }
  }

  toggle(): void {
    this.#setAiming(this.#available && !this.#aiming);
  }

  take(): boolean {
    if (!this.#aiming) {
      return false;
    }
    this.#setAiming(false);
    return true;
  }

  #setAiming(aiming: boolean): void {
    this.#aiming = aiming;
    this.hint.hidden = !aiming;
    this.button.classList.toggle("aiming", aiming);
  }
}
