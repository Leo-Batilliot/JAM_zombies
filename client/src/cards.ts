import { CardKind, type Card, type ClientConfig } from "@horde/shared";

export interface CardLabel {
  title: string;
  kind: string;
}

const kindNames: Record<CardKind, string> = {
  [CardKind.Mutation]: "Mutation",
  [CardKind.Gift]: "Gift",
  [CardKind.Spell]: "Spell",
};

export const cardLabel = (
  card: Card,
  content: ClientConfig["content"],
): CardLabel => {
  const source =
    card.kind === CardKind.Mutation
      ? content.units
      : card.kind === CardKind.Gift
        ? content.gifts
        : content.spells;
  return {
    title: source[card.index]?.name ?? "",
    kind: kindNames[card.kind],
  };
};

const sameCards = (a: Card[], b: Card[]): boolean =>
  a.length === b.length &&
  a.every(
    (card, index) =>
      card.kind === b[index]?.kind && card.index === b[index].index,
  );

export class CardPanel {
  readonly element = document.createElement("div");
  readonly #toggle = document.createElement("button");
  readonly #list = document.createElement("div");
  #cards: Card[] = [];
  #open = false;

  constructor(
    root: HTMLElement,
    readonly choose: (index: number) => void,
  ) {
    this.element.className = "cards";
    this.element.hidden = true;
    this.#toggle.type = "button";
    this.#toggle.className = "cards-toggle";
    this.#toggle.textContent = "Level up";
    this.#toggle.addEventListener("click", () => {
      this.#open = !this.#open;
      this.#list.hidden = !this.#open;
    });
    this.#list.className = "cards-list";
    this.element.append(this.#toggle, this.#list);
    root.append(this.element);
  }

  update(
    cards: Card[],
    inBattle: boolean,
    content: ClientConfig["content"],
  ): void {
    this.element.hidden = cards.length === 0;
    if (!sameCards(cards, this.#cards)) {
      this.#cards = cards;
      this.#open = !inBattle;
      this.#list.replaceChildren(
        ...cards.map((card, index) => {
          const label = cardLabel(card, content);
          const button = document.createElement("button");
          button.type = "button";
          const kind = document.createElement("span");
          kind.textContent = label.kind;
          button.append(label.title, kind);
          button.addEventListener("click", () => {
            this.choose(index);
          });
          return button;
        }),
      );
    }
    this.#list.hidden = !this.#open;
  }
}
