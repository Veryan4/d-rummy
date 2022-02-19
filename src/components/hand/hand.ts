import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit-html/directives/class-map.js";
import { repeat } from "lit/directives/repeat.js";
import { Card } from "../../models";
import { GameCard } from "../game-card/game-card";
import { cardsService } from "../../services";
import { styles } from "./hand.styles";
import "../game-card/game-card";

@customElement("card-hand")
class CardHandComponent extends LitElement {
  static styles = [styles];

  private dragElement: Element | null = null;

  @property({ type: Array })
  cards: Card[] = [];

  constructor() {
    super();

    // Prevents ugly animation after drag & drop
    document.addEventListener("dragover", function (e) {
      e.preventDefault();
    });
  }

  render() {
    const classes = { dragging: this.cards.some((card) => card.isdragging) };
    return html`
      <div class="hand">
        ${repeat(
          this.cards,
          (card) => card.id,
          (card) =>
            html` <div
              class="card-wrapper ${classMap(classes)}"
              @dragstart=${this.dragStart}
              @dragend=${this.dragEnd}
              @drop=${(e: Event) => e.preventDefault()}
              @dragover=${(e: Event) => this.dragOver(e)}
              @mousedown=${(e: Event) => this.dragMouseEventHandler(e, "true")}
              @mouseup=${(e: Event) => this.dragMouseEventHandler(e, "false")}
            >
              <game-card
                id=${"game-card-" + card.id}
                class="hand-card"
                symbol="${card.symbol}"
                rank="${card.rank}"
                @click=${() => this.toggleSelected(card)}
              ></game-card>
            </div>`
        )}
      </div>
    `;
  }

  async toggleSelected(card: Card) {
    const selectedCards = this.getSelectedCards();
    if (!card.selected && selectedCards.length > 0) {
      const potentialSet = [...selectedCards, card];
      if (!cardsService.isValidRummySet(potentialSet)) {
        return;
      }
    }
    card.selected = !card.selected;
    (
      this.renderRoot.querySelector(`#game-card-${card.id}`) as GameCard
    ).selected = card.selected;
  }

  private async reOrderHand(): Promise<void> {
    if (!this.renderRoot) {
      return;
    }
    const hand: Card[] = [];
    this.renderRoot.querySelectorAll("game-card").forEach((el: Element) => {
      const id = el.getAttribute("id")!.replace("game-card-", "");
      const card = this.cards.find((c) => c.id == id);
      if (card) {
        card.isdragging = false;
        hand.push(card);
      }
    });
    this.cards = hand;
    const options = {
      detail: { hand },
      bubbles: true,
      composed: true,
    };
    this.dispatchEvent(new CustomEvent("reordered", options));
  }

  unselectAll() {
    this.cards.forEach((card) => (card.selected = false));
    (
      this.renderRoot.querySelectorAll(`game-card`) as NodeListOf<GameCard>
    ).forEach((cardEl) => (cardEl.selected = false));
  }

  setCards(cards: Card[]) {
    this.cards = cards;
    this.requestUpdate();
  }

  getSelectedCards(): Card[] {
    return this.cards.filter((card) => card.selected);
  }

  private dragMouseEventHandler(e: Event, value: string) {
    const element = e.target as HTMLElement;
    element.setAttribute("draggable", value);
  }

  private dragOver(e: Event): void {
    e.preventDefault();
    if (!this.dragElement || !e.target) {
      return;
    }

    const target = e.target as Element;
    const selected = this.dragElement;

    let targetId = target.getAttribute("id");
    let selectedId = selected.getAttribute("id");

    if (!targetId || !selectedId) {
      return;
    }

    targetId = targetId.replace("game-card-", "");
    selectedId = selectedId.replace("game-card-", "");

    const selectedCard = this.cards.find((card) => card?.id === selectedId)!;
    if (!selectedCard) {
      return;
    }
    const targetIndex = this.cards.findIndex((card) => card?.id === targetId);
    const selectedIndex = this.cards.indexOf(selectedCard);
    selectedCard.isdragging = true;
    this.cards.splice(selectedIndex, 1);
    this.cards.splice(targetIndex, 0, selectedCard);

    this.requestUpdate();
  }

  private dragEnd(e: DragEvent): void {
    if (e) {
      e.preventDefault();
      const target = e.target as HTMLElement;
      target.setAttribute("draggable", "false");
    }
    this.dragElement = null;
    this.reOrderHand();
  }

  private dragStart(e: DragEvent): void {
    if (e) {
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", "");
        const target = e.target as Element;

        //remove transparent overlay
        const img = document.createElement("img");
        img.src =
          "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";
        e.dataTransfer.setDragImage(img, 0, 0);

        if (!this.dragElement) {
          this.dragElement = target;
        }
      }
    }
  }
}

export class CardHand extends CardHandComponent {}
