import { CardKind, type Card, type ClientConfig } from "@horde/shared";

type Content = ClientConfig["content"];
type Gift = Content["gifts"][number];
type Spell = Content["spells"][number];

export interface CardArt {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sheetWidth: number;
  sheetHeight: number;
}

export interface CardView {
  kind: string;
  title: string;
  subtitle: string;
  stats: [string, string][];
  description: string;
  sprite: string;
}

const kindNames: Record<CardKind, string> = {
  [CardKind.Mutation]: "Mutation",
  [CardKind.Gift]: "Gift",
  [CardKind.Spell]: "Spell",
};

const percent = (value: number): string =>
  `${String(Math.round(value * 100))}%`;

const giftText = (gift: Gift): string => {
  switch (gift.effect) {
    case "heal":
      return `Heals nearby troops by ${String(gift.value)} HP/s within ${String(gift.radius ?? 0)} m.`;
    case "reanimation":
      return `The dead rise ${percent(gift.value)} faster.`;
    case "soulLink":
      return `The soul link moves ${percent(gift.value)} more damage to the guard.`;
    case "speed":
      return `The mage walks ${percent(gift.value)} faster.`;
    case "vision":
      return `You see ${percent(gift.value)} farther.`;
    case "loot":
      return `Searches give ${percent(gift.value)} more loot.`;
    case "hp":
      return `The mage gains ${String(gift.value)} max HP.`;
  }
};

const spellText = (spell: Spell): string => {
  switch (spell.effect) {
    case "nova":
      return `Deals ${String(spell.damage ?? 0)} damage around the mage within ${String(spell.radius ?? 0)} m.`;
    case "rally":
      return `Troops get ${percent((spell.multiplier ?? 1) - 1)} speed and damage for ${String(spell.durationSec ?? 0)} s.`;
    case "wall":
      return `Raises a wall of bones in front of the mage for ${String(spell.durationSec ?? 0)} s.`;
    case "raise":
      return `Raises the corpses within ${String(spell.radius ?? 0)} m at once, outside battle.`;
  }
};

const place = (content: Content, unit: string) => {
  for (const lineage of content.lineages) {
    if (lineage.base === unit) {
      return { lineage: lineage.name, branch: "", tier: 0 };
    }
    for (const branch of Object.values(lineage.branches)) {
      const tier = branch.tiers.indexOf(unit);
      if (tier >= 0) {
        return { lineage: lineage.name, branch: branch.name, tier: tier + 1 };
      }
    }
  }
  return undefined;
};

const round = (value: number): string => String(Math.round(value * 10) / 10);

export const cardView = (card: Card, content: Content): CardView => {
  const kind = kindNames[card.kind];
  if (card.kind === CardKind.Mutation) {
    const unit = content.units[card.index];
    if (unit === undefined) {
      return {
        kind,
        title: "",
        subtitle: "",
        stats: [],
        description: "",
        sprite: "",
      };
    }
    const where = place(content, unit.id);
    return {
      kind,
      title: unit.name,
      subtitle:
        where === undefined
          ? ""
          : `${where.lineage} · ${where.branch} · Tier ${String(where.tier)}`,
      stats: [
        ["HP", round(unit.hp)],
        ["DPS", round(unit.damage / unit.attackIntervalSec)],
        ["Speed", round(unit.speed)],
        [
          "Range",
          unit.attackRange < 1 ? "Melee" : `${round(unit.attackRange)} m`,
        ],
        ["Worth", `${String(unit.strength)} units`],
      ],
      description:
        where?.tier === 1
          ? `All ${where.lineage.toLowerCase()} fuse into this form, now and later. Closes the other branch.`
          : "Units of the previous tier fuse into this form, now and later.",
      sprite: `unit-${unit.id}`,
    };
  }
  if (card.kind === CardKind.Gift) {
    const gift = content.gifts[card.index];
    return gift === undefined
      ? {
          kind,
          title: "",
          subtitle: "",
          stats: [],
          description: "",
          sprite: "",
        }
      : {
          kind,
          title: gift.name,
          subtitle: "Passive",
          stats: [["Stacks", `up to ${String(gift.maxStacks)}`]],
          description: giftText(gift),
          sprite: `icon-gift-${gift.effect}`,
        };
  }
  const spell = content.spells[card.index];
  return spell === undefined
    ? { kind, title: "", subtitle: "", stats: [], description: "", sprite: "" }
    : {
        kind,
        title: spell.name,
        subtitle: "Active spell",
        stats: [["Cooldown", `${round(spell.cooldownSec)} s`]],
        description: `${spellText(spell)} Replaces your current spell.`,
        sprite: `icon-spell-${spell.effect}`,
      };
};

export const artScale = (art: CardArt, box: number, scale: number): number =>
  Math.min(scale, box / Math.max(art.width, art.height));

const sameCards = (a: Card[], b: Card[]): boolean =>
  a.length === b.length &&
  a.every(
    (card, index) =>
      card.kind === b[index]?.kind && card.index === b[index].index,
  );

const artBox = 48;

export class CardPanel {
  readonly element = document.createElement("div");
  readonly #toggle = document.createElement("button");
  readonly #list = document.createElement("div");
  #cards: Card[] = [];
  #open = false;

  constructor(
    root: HTMLElement,
    readonly choose: (index: number) => void,
    readonly art: (sprite: string) => CardArt | undefined,
    readonly scale: () => number,
  ) {
    this.element.className = "cards";
    this.element.hidden = true;
    this.#toggle.type = "button";
    this.#toggle.className = "cards-toggle";
    this.#toggle.addEventListener("click", () => {
      this.#open = !this.#open;
      this.#refresh();
    });
    this.#list.className = "cards-list";
    this.element.append(this.#list, this.#toggle);
    root.append(this.element);
  }

  #refresh(): void {
    this.#list.hidden = !this.#open;
    this.#toggle.textContent = this.#open
      ? "Hide"
      : `Level up: choose a card (${String(this.#cards.length)})`;
  }

  #picture(sprite: string): HTMLElement {
    const picture = document.createElement("div");
    picture.className = "card-art";
    const art = this.art(sprite);
    if (art === undefined) {
      return picture;
    }
    const scale = artScale(art, artBox, this.scale());
    const image = document.createElement("div");
    image.style.width = `${String(art.width * scale)}px`;
    image.style.height = `${String(art.height * scale)}px`;
    image.style.backgroundImage = `url(${art.url})`;
    image.style.backgroundSize = `${String(art.sheetWidth * scale)}px ${String(art.sheetHeight * scale)}px`;
    image.style.backgroundPosition = `${String(-art.x * scale)}px ${String(-art.y * scale)}px`;
    picture.append(image);
    return picture;
  }

  #card(card: Card, index: number, content: Content): HTMLButtonElement {
    const view = cardView(card, content);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `card card-${view.kind.toLowerCase()}`;
    const kind = document.createElement("span");
    kind.className = "card-kind";
    kind.textContent = view.kind;
    const title = document.createElement("strong");
    title.textContent = view.title;
    const subtitle = document.createElement("span");
    subtitle.className = "card-subtitle";
    subtitle.textContent = view.subtitle;
    const stats = document.createElement("dl");
    for (const [label, value] of view.stats) {
      const term = document.createElement("dt");
      term.textContent = label;
      const detail = document.createElement("dd");
      detail.textContent = value;
      stats.append(term, detail);
    }
    const description = document.createElement("p");
    description.textContent = view.description;
    button.append(
      kind,
      this.#picture(view.sprite),
      title,
      subtitle,
      stats,
      description,
    );
    button.addEventListener("click", () => {
      this.choose(index);
    });
    return button;
  }

  update(cards: Card[], content: Content): void {
    this.element.hidden = cards.length === 0;
    if (!sameCards(cards, this.#cards)) {
      this.#cards = cards;
      this.#open = cards.length > 0;
      this.#list.replaceChildren(
        ...cards.map((card, index) => this.#card(card, index, content)),
      );
    }
    this.#refresh();
  }
}
