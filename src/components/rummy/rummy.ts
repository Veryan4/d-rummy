import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit-html/directives/class-map.js";
import { repeat } from "lit/directives/repeat.js";
import { TranslationController, UserController, SoundController } from "../../controllers";
import { cardsService, gunService, toastService, routerService, userService } from "../../services";
import { Card, Table, PlayerHand, GunEvent } from "../../models";
import { buttonStyles } from "../../styles";
import { styles } from "./rummy.styles";
import "@material/mwc-button";
import "../game-card/game-card";

const yourTurnSound = new Audio("/sounds/your_turn.mp3");
const theirTurnSound = new Audio("/sounds/their_turn.mp3");
const errorSound = new Audio("/sounds/error.mp3");

@customElement("card-rummy")
class Rummy extends LitElement {
  static styles = [styles, buttonStyles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);
  private sound = new SoundController(this);

  @property({ type: Array })
  selected: Card[] = [];

  @property({ type: Object })
  dragNode: Node | null = null;

  @property({ type: Object })
  table: Table = {
    players: {
      [userService.getUser()!]: new PlayerHand(),
    },
    playerOrder: [],
    deck: cardsService.createDeck(),
    pile: [],
    hasDrawn: false,
  };

  @property({ type: Array })
  players: string[] = [];

  @property({ type: Array })
  events: GunEvent<Table>[] = [];

  @property({ type: String })
  winner: string | null;

  @property({ type: Boolean })
  showPileWarning = false;

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
    const classes = { draw: this.isYourTurn() && !this.table.hasDrawn, discard: this.isYourTurn() && this.table.hasDrawn };
    return html`
      ${this.renderYourTurn()}
      <div class="table-wrapper">
        <div class="first-half">
          <div class="table ${classMap(classes)}">
            <div class="deck" @click=${this.drawFromDeck}>
              <h3>${this.i18n.t("rummy.deck")}</h3>
              <div class="row">
                ${this.renderDeck()}
                <div class="count">${this.table.deck.length}</div>
              </div>
            </div>
            <div class="pile ${classMap(classes)}" @click=${this.touchPile}>
              <h3>${this.i18n.t("rummy.pile")}</h3>
              <div class="row">
                ${this.renderPile()}
                <div class="count">${this.table.pile.length}</div>
              </div>
            </div>
          </div>
          <h3>${this.i18n.t("rummy.others")}</h3>
          <div class="others">${this.renderOthers()}</div>
        </div>
        <div class="second-half">
          <h3>${this.i18n.t("rummy.sets")}</h3>
          <div class="sets">
            ${this.table.players[this.user.value!].sets.map(
              (set) =>{
                const setLength = {
                  five: set.length === 5,
                  six: set.length === 6,
                  seven: set.length === 7,
                  eight: set.length === 8,
                  nine: set.length === 8,
                  ten: set.length === 10,
                  eleven: set.length === 11,
                  twelve: set.length === 12,
                }
                return html` <div
                class="set ${classMap(setLength)}"
                @click=${() => this.placeSet(set)}
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
              }
            )}
            <div class="set empty" @click=${() => this.placeNewSet()}>
              <div class="empty-card">${this.i18n.t("rummy.add_set")}</div>
            </div>
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
                    id=${"game-card-"+ card.id}
                    class="hand-card"
                    symbol="${card.symbol}"
                    rank="${card.rank}"
                    @click=${() => this.toggleSelected(card)}
                  ></game-card>
                </div>`
            )}
          </div>
        </div>
      </div>
      ${this.renderGameWinner()} ${this.renderPileWarning()}
    `;
  }

  renderYourTurn() {
    return this.isYourTurn()
      ? html`<h1>${this.i18n.t("rummy.you")}</h1>`
      : html`<h1>${this.i18n.t("rummy.them", {user: this.table.playerOrder[0]})}</h1>`;
  }

  renderDeck() {
    return this.table.deck.length > 0
      ? html`<game-card
          class="small"
          symbol="♠"
          rank="2"
          .unrevealed=${true}
        ></game-card>`
      : html`<div class="empty-card" @click=${this.flipPileToDeck}>
          ${this.i18n.t("rummy.flip_discard")}
        </div>`;
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
      : html`<div class="empty-card">${this.i18n.t("rummy.empty")}</div>`;
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
              })}
            </div>
          </div>
          <div class="other-sets">
            ${this.table.players[other].sets &&
            this.table.players[other].sets.length > 0
              ? this.table.players[other].sets.map(
                  (set) =>{
                    const setLength = {
                      five: set.length === 5,
                      six: set.length === 6,
                      seven: set.length === 7,
                      eight: set.length === 8,
                      nine: set.length === 8,
                      ten: set.length === 10,
                      eleven: set.length === 11,
                      twelve: set.length === 12,
                    }
                    return  html` <div
                    class="set ${classMap(setLength)}"
                    @click=${() => this.placeOthersSet(set, other)}
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

                  }
                   
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

  renderPileWarning() {
    return this.showPileWarning
      ? html` <div class="winner-overlay">
          <div class="winner-modal">
            <div class="winner-text">
              ${this.i18n.t("rummy.pile_warning", {
                count: this.table.pile.length,
              })}
            </div>
            <div class="winner-buttons">
              <mwc-button
                style="margin-right:1rem;"
                dense
                unelevated
                @click=${this.drawFromPile}
                label=${this.i18n.t("rummy.yes")}
              ></mwc-button>
              <mwc-button
                dense
                @click=${() => (this.showPileWarning = false)}
                label=${this.i18n.t("rummy.no")}
              ></mwc-button>
            </div>
          </div>
        </div>`
      : "";
  }

  rematch() {
    const table = cardsService.createRummyTable(this.table.playerOrder);
    this.sendAction(table);
  }

  returnToLobby() {
    sessionStorage.removeItem("game");
    routerService.navigate("lobby");
  }

  flipPileToDeck() {
    if (this.table.hasDrawn || !this.isYourTurn()) {
      return;
    }
    this.table.deck = this.table.pile.reverse();
    this.table.pile = [];
    this.sendAction(this.table);
  }

  async toggleSelected(card: Card) {
    if (card.selected) {
      this.selected = this.selected.filter((c) => c.id !== card.id);
    } else {
      if (this.selected.length > 0) {
        const potentialSet = this.selected.concat([card]);
        if (!this.isValidSet(potentialSet)) {
          return;
        }
      }
      if (!this.selected.some((c) => c.id === card.id)) {
        this.selected.push(card);
      }
    }
    card.selected = !card.selected;
    (this.shadowRoot!.querySelector(`#game-card-${card.id}`) as any).selected = card.selected
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

  async _renderEvents(rummyEvents: GunEvent<Table>[]): Promise<void> {
    if (this.events !== rummyEvents) {
      this.events = rummyEvents;
      const table = rummyEvents[rummyEvents.length - 1].what;
      if (this.table !== table) {
        // Prevents re-ordering of hand by other players
        const hand = this.table.players[this.user.value!].hand;
        this.table = table;
        if (
          table.playerOrder[0] !== this.user.value &&
          table.hasDrawn &&
          hand.length > 0
        ) {
          this.table.players[this.user.value!].hand = hand;
        }

        // Sounds
        if (!table.hasDrawn) {
          if (table.playerOrder[0] === this.user.value) {
            this.sound.play(yourTurnSound);
          } else {
            this.sound.play(theirTurnSound);
          }
        }

        // Checks for EndGame
        this.winner = this.isGameOver(this.table);
        if (this.winner) {
          this.selected = [];
        }

        if (this.isYourTurn() && !this.table.hasDrawn) {
          toastService.newToast("rummy.you");
        }

        await this.updateComplete;
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
      gunService.db.get(`${playersString}-rummy-game`)
        .map(match as any)
        // @ts-ignore
        .then(async (data) => {
          if (data) {
            await this.handleGunData(data);
          }
        });

        gunService.db.get(`${playersString}-rummy-game`)
        .map(match as any)
        .on(async (onData) => {
          if (onData) {
            await this.handleGunData(onData);
          }
        });
    }
  }

  private async handleGunData(data: any) {
    const event = await gunService.getEventFromData(data);
    if (event.what) {
      const events = [...this.events.slice(-100), event].sort(
        (a, b) => a.when - b.when
      ) as GunEvent<Table>[];
      this._renderEvents(events);
    }
  }

  isYourTurn(): boolean {
    return this.table.playerOrder[0] === this.user.value;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    if (this.players.length > 0) {
      gunService.db.get(`${gunService.getPlayersString(this.players)}-rummy-game`).off();
    }
  }

  async sendAction(what: Table): Promise<void> {
    if (this.players.length > 0) {
      await gunService.sendAction(
        `${gunService.getPlayersString(this.players)}-rummy-game`,
        what
      );
    }
  }

  drawFromDeck(): void {
    if (this.table.hasDrawn) {
      return;
    }
    if (!this.isYourTurn()) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.wait_your_turn");
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

  touchPile() {
    if (this.table.hasDrawn) {
      this.discardToPile();
    } else {
      if (this.table.pile.length > 1) {
        if (!this.isYourTurn()) {
          this.sound.play(errorSound);
          toastService.newError("rummy.error.wait_your_turn");
          return;
        }
        this.showPileWarning = true;
      } else {
        this.drawFromPile();
      }
    }
  }

  drawFromPile(): void {
    if (this.table.hasDrawn || this.table.pile.length === 0) {
      return;
    }
    if (!this.isYourTurn()) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.wait_your_turn");
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
    this.showPileWarning = false;
  }

  placeOthersSet(cards: Card[], otherPlayer: string) {
    if (this.table.players[this.user.value!].sets.length === 0) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.place_set_first");
      return;
    }
    this.placeSet(cards, otherPlayer);
    toastService.newToast("rummy.place_other_set", {from: this.user.value!, to: otherPlayer})
  }

  placeSet(cards: Card[], otherPlayer?: string) {
    let set = cards.concat(this.selected).map((card) => {
      card.selected = false;
      return card;
    });
    set = [...new Set(set)].sort((a, b) =>
      a.value > b.value ? 1 : b.value > a.value ? -1 : 0
    );

    if (!this.isYourTurn()) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.wait_your_turn");
      return;
    }
    if (set.length < 3) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.need_3_cards");
      return;
    }
    if (!this.isValidSet(set)) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.need_valid_set");
      return;
    }

    const user = this.user.value!;
    const player = otherPlayer ? otherPlayer : user;

    this.table.players[player].sets = this.table.players[player].sets.map(
      (s) => {
        if (set.some((c) => s[0].id === c.id)) {
          return set;
        }
        return s;
      }
    );

    this.table.players[user].hand = this.table.players[user].hand.filter(
      (c) => !set.some((card) => card.id === c.id)
    );

    this.sendAction(this.table);
    this.selected = [];
  }

  placeNewSet() {
    let set = this.selected.map((card) => {
      card.selected = false;
      return card;
    });
    set = [...new Set(set)].sort((a, b) =>
      a.value > b.value ? 1 : b.value > a.value ? -1 : 0
    );

    if (!this.isYourTurn()) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.wait_your_turn");
      return;
    }
    if (set.length < 3) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.need_3_cards");
      return;
    }
    if (!this.isValidSet(set)) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.need_valid_set");
      return;
    }

    const user = this.user.value!;

    this.table.players[user].sets.push(set);
    this.table.players[user].hand = this.table.players[user].hand.filter(
      (c) => !set.some((card) => card.id === c.id)
    );

    this.sendAction(this.table);
    this.selected = [];
  }

  isValidSet(set: Card[]): boolean {
    // Can be all matching ranks
    let values = set.map((card) => card.value);
    if (values.every((v) => v === values[0])) {
      return true;
    }

    // Otherwise can't have duplicate ranks in a straight
    if (new Set(values).size !== values.length) {
      return false;
    }

    // Straight needs to be of the same suit
    const colors = set.map((card) => card.color);
    if (new Set(colors).size > 1) {
      return false;
    }

    // Needs to be a straight
    values = values.sort((a, b) => (a > b ? 1 : b > a ? -1 : 0));
    let valid = true;
    values.forEach((v, i) => {
      if (v !== 1 && i !== 0) {
        if (values[i - 1] !== values[i] - 1) {
          valid = false;
        }
      }
    });
    return valid;
  }

  reOrderHand(): void {
    const hand: Card[] = [];
    this.renderRoot.querySelectorAll(".card-wrapper").forEach((el: Element) => {
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
    if (!this.table.hasDrawn) {
      return;
    }
    if (!this.isYourTurn()) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.wait_your_turn");
      return;
    }
    if (this.selected.length === 0) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.select_discard");
      return;
    }
    if (this.selected.length !== 1) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.only_discard_1");
      return;
    }
    const card = this.selected[0];
    card.selected = false;
    this.table.players[this.user.value!].hand = this.table.players[
      this.user.value!
    ].hand.filter((c) => card.id !== c.id);
    this.table.pile.push(card);
    this.table.playerOrder.push(this.table.playerOrder.shift()!);
    this.table.hasDrawn = false;
    this.selected = [];
    this.sendAction(this.table);
  }

  isGameOver(table: Table): string | null {
    let gameOver = null;
    table.playerOrder.forEach((player) => {
      if (table.players[player].hand.length === 0) {
        gameOver = player;
      }
    });
    return gameOver;
  }
}
