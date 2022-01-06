import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit-html/directives/class-map.js";
import { repeat } from "lit/directives/repeat.js";
import { TranslationController } from "../../controllers/translation.controller";
import { UserController } from "../../controllers/user.controller";
import { cardsService } from "../../services/cards.service";
import { gunService } from "../../services/gun.service";
import { navigate } from "../../services/router.service";
import { Card, Table, PlayerHand } from "../../models/cards.model";
import { user, userService, db } from "../../services/user.service";

import "../game-card/game-card";
import { styles } from "./rummy.styles";
import "@material/mwc-button";
import "@material/mwc-formfield";
import "@material/mwc-textfield";

import GUN from "gun";
const encryptKey = "#foo";

class RummyEvent {
  who: string;
  when: number;
  what: Table;
}

@customElement("card-rummy")
class Rummy extends LitElement {
  static styles = [styles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);

  @property({ type: Array })
  selected: Card[] = [];

  @property({ type: Object })
  dragNode: Node | null = null;

  @property({ type: Object })
  table: Table = {
    players: {
      [userService.user()!]: new PlayerHand(),
    },
    playerOrder: [],
    deck: cardsService.createDeck(),
    pile: [],
    hasDrawn: false,
  };

  @property({ type: Array })
  players: string[] = [];

  @property({ type: Array })
  events: RummyEvent[] = [];

  @property({ type: String })
  winner: string;

  constructor() {
    super();

    const players = sessionStorage.getItem("players");
    if (players) {
      this.players = JSON.parse(players);
    }

    // Prevents ugly animation after drag & drop
    document.addEventListener("dragover", function (e) {
      e.preventDefault();
    });
  }

  render() {
    const classes = { draw: this.isYourTurn() && !this.table.hasDrawn };
    return html`
      <div class="table-wrapper">
        <div class="first-half">
          <h3>${this.i18n.t("rummy.deck")}</h3>
          ${this.renderYourTurn()}
          <div class="table ${classMap(classes)}">
            <div class="deck" @click=${this.drawFromDeck}>
              ${this.renderDeck()}
              <div class="count">${this.table.deck.length}</div>
            </div>
            <div class="pile" @click=${this.drawFromPile}>
              ${this.renderPile()}
              <div class="count">${this.table.pile.length}</div>
            </div>
          </div>
          <h3>${this.i18n.t("rummy.others")}</h3>
          <div class="others">${this.renderOthers()}</div>
        </div>
        <div class="second-half">
          <h3>${this.i18n.t("rummy.sets")}</h3>
          <div class="sets">
            ${this.table.players[this.user.value!].sets &&
            this.table.players[this.user.value!].sets.length > 0
              ? this.table.players[this.user.value!].sets.map(
                  (set) =>
                    html` <div
                      class="set"
                      @click=${(e: Event) => this.placeSet(set)}
                    >
                      ${set.map(
                        (card) =>
                          html`<game-card
                            class="small"
                            symbol="${card.symbol}"
                            rank="${card.rank}"
                          ></game-card>`
                      )}
                    </div>`
                )
              : html` <div
                  class="set empty"
                  @click=${(e: Event) => this.placeSet([])}
                >
                  <div class="empty-card"></div>
                </div>`}
          </div>
          <h3>${this.i18n.t("rummy.hand")}</h3>
          <div class="hand">
            ${repeat(
              this.table.players[this.user.value!].hand,
              (card) => card.id,
              (card) =>
                html` <div
                  class="card-wrapper"
                  id=${card.id}
                  @dragstart=${this.dragStart}
                  @dragend=${this.dragEnd}
                  @dragover=${this.dragOver}
                  @mousedown=${(e: Event) =>
                    this.dragMouseEventHandler(e, "true")}
                  @mouseup=${(e: Event) =>
                    this.dragMouseEventHandler(e, "false")}
                >
                  <game-card
                    class="hand-card"
                    symbol="${card.symbol}"
                    rank="${card.rank}"
                    .selected=${card.selected}
                    @click=${(e: any) => this.toggleSelected(card)}
                  ></game-card>
                </div>`
            )}
          </div>
          ${this.renderDiscard()}
        </div>
      </div>
      ${this.renderGameWinner()}
    `;
  }

  renderYourTurn() {
    return this.isYourTurn() ? html`<h4>${this.i18n.t("rummy.you")}</h4>` : "";
  }

  renderDeck() {
    return this.table.deck.length > 0
      ? html`<game-card
          class="small"
          symbol="♠"
          rank="2"
          .unrevealed=${true}
        ></game-card>`
      : html`<div class="empty-card" @click=${this.flipPileToDeck}></div>`;
  }

  renderPile() {
    let topCard = null;
    if (this.table.pile.length > 0) {
      topCard = this.table.pile[this.table.pile.length - 1];
    }
    return topCard
      ? html`<game-card
          class="small"
          symbol="${topCard.symbol}"
          rank="${topCard.rank}"
        ></game-card>`
      : html`<div class="empty-card"></div>`;
  }

  renderOthers() {
    const players = Object.keys(this.table.players);
    const others = players.filter((player) => player != this.user.value);
    return others.map((other) => {
      const src = "https://avatars.dicebear.com/api/initials/" + other + ".svg";
      const classes = { active: other == this.table.playerOrder[0] };
      return html`
        <div class="other ${classMap(classes)}">
          <div class="other-info">
            <img class="player-image" src=${src} alt="avatar" />
            <div class="other-name">
              ${this.i18n.t("rummy.player", {
                player: other,
                amount: this.table.players[other].hand.length,
              })}${other == this.table.playerOrder[0]
                ? this.i18n.t("rummy.their_turn")
                : ""}
            </div>
          </div>
          <div class="other-sets">
            ${this.table.players[other].sets &&
            this.table.players[other].sets.length > 0
              ? this.table.players[other].sets.map(
                  (set) =>
                    html` <div
                      class="set"
                      @click=${(e: Event) => this.placeOthersSet(set)}
                    >
                      ${set.map(
                        (card) =>
                          html`<game-card
                            class="small"
                            symbol="${card.symbol}"
                            rank="${card.rank}"
                          ></game-card>`
                      )}
                    </div>`
                )
              : html` <div class="set empty">
                  ${this.i18n.t("rummy.no_set")}
                </div>`}
          </div>
        </div>
        ${other !== this.table.playerOrder[0] &&
        other !== others[others.length - 1]
          ? html`<hr />`
          : ""}
      `;
    });
  }

  renderDiscard() {
    return this.selected.length === 1 &&
      this.table.hasDrawn &&
      this.isYourTurn()
      ? html` <mwc-button
          dense
          unelevated
          @click=${this.discardToPile}
          label=${this.i18n.t("rummy.discard")}
        ></mwc-button>`
      : html`<h5>${this.i18n.t("rummy.discard_end")}</h5>`;
  }

  renderGameWinner() {
    return this.winner
      ? html` <div class="winner-overlay">
          <div class="winner-modal">
            <div class="winner-text">
              <b>${this.winner}</b> ${this.i18n.t("rummy.win")}
            </div>
            <div class="winner-buttons">
              <mwc-button
                style="margin-right:1rem;"
                dense
                unelevated
                @click=${this.rematch}
                label=${this.i18n.t("rummy.rematch")}
              ></mwc-button>
              <mwc-button
                dense
                @click=${this.returnToLobby}
                label=${this.i18n.t("rummy.return")}
              ></mwc-button>
            </div>
          </div>
        </div>`
      : "";
  }

  rematch() {
    const table = cardsService.createRummyTable(this.players);
    this.sendAction(table);
  }

  returnToLobby() {
    sessionStorage.removeItem("game");
    navigate("lobby");
  }

  flipPileToDeck() {
    if (this.table.hasDrawn || !this.isYourTurn()) {
      return;
    }
    this.table.deck = this.table.pile.reverse();
    this.table.pile = [];
    this.sendAction(this.table);
  }

  toggleSelected(card: Card) {
    card.selected = !card.selected;
    if (card.selected) {
      this.selected.push(card);
    } else {
      this.selected = this.selected.filter((c) => c.id !== card.id);
    }
    this.requestUpdate();
  }

  private dragMouseEventHandler(e: Event, value: string) {
    const element = e.target as HTMLElement;
    element.setAttribute("draggable", value);
  }

  private dragOver(e: Event): void {
    e.preventDefault();
    const target = e.target as Element;
    const selected = this.dragNode;
    if (
      selected &&
      this.isNodeBefore(selected, target.parentNode!) &&
      target.parentNode &&
      target.parentNode.parentNode
    ) {
      target.parentNode.parentNode.insertBefore(selected, target.parentNode);
    } else if (selected && target.parentNode && target.parentNode.parentNode) {
      target.parentNode.parentNode.insertBefore(
        selected,
        target.parentNode.nextSibling
      );
    }
  }

  private dragEnd(e: DragEvent): void {
    if (e) {
      e.preventDefault();
      const target = e.target as HTMLElement;
      target.setAttribute("draggable", "false");
    }
    this.dragNode = null;
    this.reOrderHand();
  }

  private dragStart(e: DragEvent): void {
    if (e) {
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", "");
        const target = e.target as Node;
        this.dragNode = target.parentNode;
      }
    }
  }

  private isNodeBefore(el1: Node, el2: Node): boolean {
    let cur;
    if (el2.parentNode === el1.parentNode) {
      for (cur = el1.previousSibling; cur; cur = cur.previousSibling) {
        if (cur === el2) return true;
      }
    }
    return false;
  }

  _renderEvents(rummyEvents: RummyEvent[]): void {
    if (this.events !== rummyEvents) {
      this.events = rummyEvents;
      const table = rummyEvents[rummyEvents.length - 1].what;
      if (this.table !== table) {
        // Prevents re-ordering of hand by other players
        const hand = this.table.players[this.user.value!].hand;
        this.table = table;
        if (!this.isYourTurn() && table.hasDrawn && hand.length > 0) {
          this.table.players[this.user.value!].hand = hand;
        }

        // Checks for EndGame
        const winner = this.isGameOver(this.table);
        if (winner) {
          this.winner = winner;
        }

        this.requestUpdate();
      }
    }
  }

  async connectedCallback(): Promise<void> {
    super.connectedCallback();

    const match = {
      // lexical queries are kind of like a limited RegEx or Glob.
      ".": {
        // property selector
        ">": new Date(+new Date() - 1 * 1000 * 60 * 60 * 3).toISOString(), // find any indexed property larger ~3 hours ago
      },
      "-": 1, // filter in reverse
    };

    if (this.players.length > 0) {
      const playersString = gunService.getPlayersString(this.players);
      db.get(`${playersString}-rummy-game`)
        .map(match as any)
        // @ts-ignore
        .then(async (data) => {
          if (data) {
            await this.handleGunData(data);
          }
        });

      db.get(`${playersString}-rummy-game`)
        .map(match as any)
        .on(async (onData) => {
          if (onData) {
            await this.handleGunData(onData);
          }
        });
    }
  }

  private async handleGunData(data: any) {
    const event = await gunService.getEventFromData(data)
    if (event.what) {
      const events = [...this.events.slice(-100), event].sort(
        (a, b) => a.when - b.when
      ) as RummyEvent[];
      this._renderEvents(events);
    }
  }

  isYourTurn(): boolean {
    return this.table.playerOrder[0] === this.user.value;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    if (this.players.length > 0) {
      db.get(`${gunService.getPlayersString(this.players)}-rummy-game`).off();
    }
  }

  async sendAction(what: Table): Promise<void> {
    if (this.players.length > 0) {
      await gunService.sendAction(`${gunService.getPlayersString(this.players)}-rummy-game`, what)
    }
  }

  drawFromDeck(): void {
    if (this.table.hasDrawn || !this.isYourTurn()) {
      return;
    }
    this.table.hasDrawn = true;
    this.table.deck = cardsService.shuffle(this.table.deck);
    cardsService.moveCard(
      this.table.deck,
      this.table.players[this.user.value!].hand,
      "top",
      "top"
    );
    this.sendAction(this.table);
  }

  drawFromPile(): void {
    if (this.table.hasDrawn || !this.isYourTurn()) {
      return;
    }
    this.table.hasDrawn = true;
    cardsService.moveCards(
      this.table.pile,
      this.table.players[this.user.value!].hand,
      "top",
      "top",
      this.table.pile.length
    );
    this.sendAction(this.table);
  }

  placeOthersSet(cards: Card[]) {
    if (this.table.players[this.user.value!].sets.length > 0) {
      this.placeSet(cards);
    }
  }

  placeSet(cards: Card[]) {
    const set = cards.concat(this.selected).map((card) => {
      card.selected = false;
      return card;
    });
    if (!this.isYourTurn()) {
      return;
    }
    if (!this.isValidSet(set)) {
      return;
    }
    const players = Object.keys(this.table.players);
    let currentSet: Card[] = [];
    players.forEach((player) => {
      this.table.players[player].sets.forEach((s) => {
        if (set.some((c) => s[0].id === c.id)) {
          currentSet = set;
        }
      });
      if (currentSet.length > 0) {
        this.table.players[player].sets = this.table.players[
          player
        ].sets.filter((s) => s != currentSet);
      }
    });
    const user = this.user.value!;
    if (currentSet.length == 0) {
      this.table.players[user].sets.push(set);
    }
    this.table.players[user].hand = this.table.players[
      user
    ].hand.filter((c) => !set.some((card) => card.id === c.id));
    this.sendAction(this.table);
    this.selected = [];
  }

  isValidSet(set: Card[]): boolean {
    // set has to be at least 3 cards
    if (set.length < 3) {
      return false;
    }
    // Can be all matching ranks
    let values = set.map((card) => card.value);
    if (values.every((v) => v === values[0])) {
      return true;
    }
    // Otherwise needs to be a straight of the same suit
    const colors = set.map((card) => card.color);
    if (colors.every((c) => c === colors[0])) {
      values = values.sort();
      const first = values[0];
      const last = values[values.length - 1];
      let count = 0;
      for (let i = first; i < last; i++) {
        if (values[count] != i) {
          return false;
        }
        count++;
      }
      return true;
    }
    return false;
  }

  reOrderHand(): void {
    const hand: Card[] = [];
    this.renderRoot
      .querySelectorAll(".card-wrapper")
      .forEach((el: Element, i) => {
        const id = el.getAttribute("id")!;
        const card = this.table.players[this.user.value!].hand.find(
          (c) => c.id == id
        );
        hand.push(card!);
      });
    this.table.players[this.user.value!].hand = hand;
  }

  //ends turn
  discardToPile(): void {
    const card = this.selected[0];
    card.selected = false;
    if (!this.isYourTurn()) {
      return;
    }
    const players = Object.keys(this.table.players);
    players.forEach((player) => {
      if (this.table.players[player].hand.some((c) => card.id === c.id)) {
        this.table.players[player].hand = this.table.players[
          player
        ].hand.filter((c) => card.id !== c.id);
        this.table.pile.push(card);
      }
    });
    this.table.playerOrder.push(this.table.playerOrder.shift()!);
    this.table.hasDrawn = false;
    this.sendAction(this.table);
  }

  isGameOver(table: Table): false | string {
    let gameOver: false | string = false;
    table.playerOrder.forEach((player) => {
      if (table.players[player].hand.length === 0) {
        gameOver = player;
      }
    });
    return gameOver;
  }
}