export class DeathScreen {
  readonly element = document.createElement("div");

  constructor(root: HTMLElement) {
    this.element.className = "death";
    this.element.hidden = true;
    root.append(this.element);
  }

  show(killer: string): void {
    this.element.textContent =
      killer === ""
        ? "You were devoured. Rising again..."
        : `You were devoured by ${killer}. Rising again...`;
    this.element.hidden = false;
  }

  hide(): void {
    this.element.hidden = true;
  }
}
