import type { BossHealth } from "@horde/shared";

export const bossLabel = (boss: BossHealth): string =>
  `${String(boss.hp)} HP / ${String(boss.maxHp)}`;

export class BossBar {
  readonly element = document.createElement("div");
  readonly #name: HTMLElement;
  readonly #fill: HTMLElement;
  readonly #text: HTMLElement;

  constructor(root: HTMLElement) {
    this.element.className = "boss-bar";
    this.element.hidden = true;
    this.element.innerHTML = `
      <div class="boss-name"></div>
      <div class="boss-track"><div class="boss-fill"></div><span></span></div>
    `;
    root.append(this.element);
    const find = (selector: string) =>
      this.element.querySelector(selector) as HTMLElement;
    this.#name = find(".boss-name");
    this.#fill = find(".boss-fill");
    this.#text = find(".boss-track span");
  }

  update(bosses: BossHealth[], name: (event: number) => string): void {
    const [boss] = bosses;
    this.element.hidden = boss === undefined;
    if (boss === undefined) {
      return;
    }
    this.#name.textContent = name(boss.event);
    const ratio = boss.maxHp > 0 ? boss.hp / boss.maxHp : 0;
    this.#fill.style.width = `${String(Math.round(ratio * 100))}%`;
    this.#text.textContent = bossLabel(boss);
  }
}
