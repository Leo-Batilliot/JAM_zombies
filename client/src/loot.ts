export class LootNotice {
  readonly element = document.createElement("div");

  constructor(root: HTMLElement) {
    this.element.className = "loot";
    root.append(this.element);
  }

  show(name: string, durationMs: number): void {
    const line = document.createElement("div");
    line.textContent = `Found: ${name}`;
    this.element.append(line);
    setTimeout(() => {
      line.remove();
    }, durationMs);
  }
}
