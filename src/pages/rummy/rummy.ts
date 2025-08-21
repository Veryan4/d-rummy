import { LitElement, html } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { UserController, PeerController } from "../../controllers";
import { cardsService, userService } from "../../services";
import {
  TranslationController,
  SoundController,
  routerService,
  toastService,
} from "@veryan/lit-spa";
import { Card, Table, PlayerHand, EncryptedCard } from "../../models";
import { CardHand } from "../../components/hand/hand";
import { styles } from "./rummy.styles";

import "../../material-web";
import "../../components/game-card/game-card";
import "../../components/hand/hand";
import "@veryan/lit-spa";

const yourTurnSound = new Audio("/sounds/your_turn.mp3");
const theirTurnSound = new Audio("/sounds/their_turn.mp3");
const errorSound = new Audio("/sounds/error.mp3");

@customElement("card-rummy")
class Rummy extends LitElement {
  static styles = [styles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);
  private sound = new SoundController(this);
  private peerController: PeerController;

  private debounceInterval = 150;
  private timer: number;
  private players: string[] = [];
  private others: string[] = [];
  private myHand: Card[] = [];
  private decryptedMap: Record<string, string> = {};
  private subscriptions: (() => boolean)[] = [];

  @query("card-hand")
  cardHand: CardHand;

  @state()
  private winner: string | null;

  @state()
  private showPileWarning = false;

  private table: Table = {
    players: {
      [userService.getUser()!]: new PlayerHand(),
    },
    whoseTurn: "",
    playerOrder: [],
    deck: [],
    pile: [],
    hasDrawn: false,
    turn: 0,
  };

  constructor() {
    super();
    const players = sessionStorage.getItem("players");
    if (players) {
      this.players = JSON.parse(players);
      this.others = this.players.filter((player) => player != this.user.value);
      const table = sessionStorage.getItem("table");
      if (table) {
        this.table = JSON.parse(table);
        const hand = sessionStorage.getItem("hand");
        this.myHand = hand ? JSON.parse(hand) : [];
        const decryptedMap = sessionStorage.getItem("decryptedMap");
        this.decryptedMap = decryptedMap ? JSON.parse(decryptedMap) : {};
        this.restoreTable();
      }
      this.initializePeerConnections();
    }
  }

  render() {
    return !this.table.whoseTurn
      ? html`<lit-spa-loader></lit-spa-loader>`
      : this.renderGame();
  }

  renderGame() {
    const classes = {
      draw: this.isYourTurn() && !this.table.hasDrawn,
      discard: this.isYourTurn() && this.table.hasDrawn,
    };
    return html`
      ${this.renderYourTurn()}
      <div class="table-wrapper">
        <div class="first-half">
          <div>
            <h3>${this.i18n.t("rummy.sets")}</h3>
            <div class="sets">
              ${this.table.players[this.user.value!].sets.map(
                (set) =>
                  html` <div
                    class="set ${classMap({ ["set-" + set.length]: true })}"
                    @click=${() => this.placeSet(set)}
                  >
                    ${set.map(
                      (card) =>
                        html` <game-card
                          class="small"
                          symbol="${card.symbol}"
                          rank="${card.rank}"
                        ></game-card>`
                    )}
                  </div>`
              )}
              <div class="set empty" @click=${() => this.placeNewSet()}>
                <div class="empty-card">${this.i18n.t("rummy.add_set")}</div>
              </div>
            </div>
          </div>
          <div>
            <h3>${this.i18n.t("rummy.others")}</h3>
            <div class="others">${this.renderOthers()}</div>
          </div>
        </div>
        <div class="second-half">
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
          <h3>${this.i18n.t("rummy.hand")}</h3>
          <card-hand
            @reordered=${(e: CustomEvent) => this.reorderHand(e.detail.hand)}
          ></card-hand>
        </div>
      </div>
      ${this.renderGameWinner()} ${this.renderPileWarning()}
    `;
  }

  renderYourTurn() {
    return this.isYourTurn()
      ? html`<h1>${this.i18n.t("rummy.you")}</h1>`
      : html`<h1>
          ${this.i18n.t("rummy.them", { user: this.table.whoseTurn })}
        </h1>`;
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
    return this.others.map((other) => {
      const src = "https://api.dicebear.com/7.x/pixel-art/svg?seed=" + other;
      const classes = {
        active: other == this.table.whoseTurn,
        error: !this.table.players[other].connected,
      };
      return html`
        <div class="other ${classMap(classes)}">
          <div class="other-info">
            <img class="player-image" src=${src} alt="avatar" />
            <div class="other-name ${classMap(classes)}">
              ${this.table.players[other].connected
                ? html`${this.i18n.t("rummy.player", {
                    player: other,
                    amount:
                      this.table.players[other].encryptedCards.length +
                      this.table.players[other].cards.length,
                  })}`
                : html`${this.i18n.t("rummy.disconnected", {
                    player: other,
                  })}`}
            </div>
          </div>
          <div class="other-sets">
            ${this.table.players[other].sets &&
            this.table.players[other].sets.length > 0
              ? this.table.players[other].sets.map(
                  (set) =>
                    html` <div
                      class="set ${classMap({ ["set-" + set.length]: true })}"
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
                )
              : html` <div class="set empty">
                  ${this.i18n.t("rummy.no_set")}
                </div>`}
          </div>
        </div>
        ${other !== this.table.whoseTurn &&
        other !== this.others[this.others.length - 1]
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
              <md-filled-button
                style="margin-right:1rem;"
                @click=${this.rematch}
                >${this.i18n.t("rummy.rematch")}</md-filled-button
              >
              <md-filled-button @click=${this.returnToLobby}
                >${this.i18n.t("rummy.return")}</md-filled-button
              >
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
              <md-filled-button
                style="margin-right:1rem;"
                @click=${this.drawFromPile}
                >${this.i18n.t("rummy.yes")}</md-filled-button
              >
              <md-filled-button @click=${() => (this.showPileWarning = false)}
                >${this.i18n.t("rummy.no")}</md-filled-button
              >
            </div>
          </div>
        </div>`
      : "";
  }

  initializePeerConnections() {
    this.peerController = new PeerController(this.players, this.table);
    this.subscriptions = [
      this.peerController.tableState.subscribe((data) =>
        this.handlePeerTable(data)
      ),
      this.peerController.connectionState.subscribe((data) =>
        this.playerConnection(data)
      ),
      this.peerController.decryptedCardsState.subscribe((data) =>
        this.decryptCards(data)
      ),
    ];
  }

  async connectedCallback(): Promise<void> {
    super.connectedCallback();
    window.onbeforeunload = () => {
      this.peerController.disconnect();
    };
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.subscriptions.forEach((s) => s());
    this.peerController.disconnect();
  }

  private async handlePeerTable(data: { table: Table }) {
    clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      if (!cardsService.areTablesEqual(this.table, data.table)) {
        await this.updateTable(data.table, true);
      }
    }, this.debounceInterval);
  }

  async playerConnection(data: { playerName: string; isConnected: boolean }) {
    if (!data.isConnected) {
      if (this.isGameOver(this.table)) {
        this.returnToLobby();
      }
    }
    if (this.table.players[data.playerName]) {
      this.table.players[data.playerName].connected = data.isConnected;
      this.requestUpdate();
    }
  }

  async restoreTable(): Promise<void> {
    this.updateTable(this.table);
    this.requestUpdate();
    await this.updateComplete;
    this.cardHand.setCards(this.myHand);
  }

  async sendTableUpdate(): Promise<void> {
    this.updateTable(this.table);
    this.requestUpdate();
    await this.updateComplete;
    this.cardHand.setCards(this.myHand);
    this.peerController.sendTableUpdate(this.table);
  }

  async updateTable(table: Table, updateByOther?: boolean) {
    // prevent page refresh + click to turn back time
    if (table.turn < this.table.turn && table.turn !== 0) {
      return;
    }

    if (table.turn == 0 && !table.hasDrawn) {
      this.table = table;
      if (!this.playerHasCards(this.user.value!)) {
        table.playerOrder.some((player, i) => {
          if (
            (i == 0 ||
              table.players[table.playerOrder[i - 1]].encryptedCards.length) &&
            player === this.user.value
          ) {
            this.myHand = [];
            const cardsToDecrypt: EncryptedCard[] = [];
            cardsService.moveCards(
              table.deck,
              cardsToDecrypt,
              "top",
              "bottom",
              7
            );
            this.peerController.decryptCards(cardsToDecrypt);
            return true;
          }
          return false;
        });
      }
    }

    if (updateByOther) {
      this.table = table;
      this.requestUpdate();
    }
    sessionStorage.setItem("table", JSON.stringify(table));

    if (!table.hasDrawn) {
      if (table.whoseTurn === this.user.value) {
        this.sound.play(yourTurnSound);
      } else {
        this.sound.play(theirTurnSound);
      }
    }

    this.winner = this.isGameOver(this.table);
    if (this.winner) {
      this.cardHand.unselectAll();
    }

    if (this.isYourTurn() && !this.table.hasDrawn) {
      toastService.newToast("rummy.you");
    }
  }

  drawFromDeck(): void {
    if (
      this.table.hasDrawn ||
      this.table.playerOrder.some((player) => !this.playerHasCards(player))
    ) {
      return;
    }
    if (!this.isYourTurn()) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.wait_your_turn");
      return;
    }
    this.table.hasDrawn = true;
    const cardsToDecrypt: EncryptedCard[] = [];
    cardsService.moveCard(this.table.deck, cardsToDecrypt, "top", "bottom");
    this.peerController.decryptCards(cardsToDecrypt);
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
    this.addCardsToHand(this.table.pile);
    this.table.pile = [];
    this.table.hasDrawn = true;
    this.sendTableUpdate();
    this.showPileWarning = false;
  }

  placeOthersSet(cards: Card[], otherPlayer: string) {
    if (this.table.players[this.user.value!].sets.length === 0) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.place_set_first");
      return;
    }
    const placedSet = this.placeSet(cards, otherPlayer);
    if (placedSet) {
      toastService.newToast("rummy.place_other_set", {
        from: this.user.value!,
        to: otherPlayer,
      });
    }
  }

  placeSet(cards: Card[], otherPlayer?: string) {
    const selected = this.cardHand.getSelectedCards();
    let set = cards.concat(selected).map((card) => {
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
    if (!this.table.hasDrawn) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.draw_to_start");
      return;
    }
    if (set.length < 3) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.need_3_cards");
      return;
    }
    if (!cardsService.isValidRummySet(set)) {
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
    this.removeCardsFromHand(set);
    this.sendTableUpdate();

    return true;
  }

  placeNewSet() {
    const selected = this.cardHand.getSelectedCards();
    let set = selected.map((card) => {
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
    if (!cardsService.isValidRummySet(set)) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.need_valid_set");
      return;
    }

    this.table.players[this.user.value!].sets.push(set);
    this.cardHand.unselectAll();
    this.removeCardsFromHand(set);
    this.sendTableUpdate();
  }

  discardToPile(): void {
    if (!this.table.hasDrawn) {
      return;
    }
    if (!this.isYourTurn()) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.wait_your_turn");
      return;
    }

    const selected = this.cardHand.getSelectedCards();

    if (selected.length === 0) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.select_discard");
      return;
    }
    if (selected.length !== 1) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.only_discard_1");
      return;
    }

    const card = selected[0];
    card.selected = false;
    this.cardHand.unselectAll();
    this.removeCardsFromHand([card]);

    let next = this.table.playerOrder.indexOf(this.table.whoseTurn);
    if (next === this.table.playerOrder.length - 1) {
      next = 0;
    } else {
      next++;
    }
    this.table = {
      ...this.table,
      pile: [...this.table.pile, card],
      whoseTurn: this.table.playerOrder[next],
      hasDrawn: false,
      turn: this.table.turn + 1,
    };

    this.sendTableUpdate();
  }

  isGameOver(table: Table): string | null {
    if (!table?.turn) return null;
    let gameOver = null;
    table.playerOrder.forEach((player) => {
      if (!this.playerHasCards(player)) {
        gameOver = player;
      }
    });
    return gameOver;
  }

  rematch() {
    this.decryptedMap = {};
    this.myHand = [];
    const playerOrder = [...this.table.playerOrder];
    playerOrder.push(playerOrder.shift()!);
    this.peerController.initializeDeck(playerOrder);
  }

  returnToLobby() {
    sessionStorage.removeItem("game");
    sessionStorage.removeItem("players");
    sessionStorage.removeItem("table");
    sessionStorage.removeItem("hand");
    sessionStorage.removeItem("secretMap");
    sessionStorage.removeItem("decryptedMap");
    routerService.navigate("");
  }

  flipPileToDeck() {
    if (this.table.hasDrawn || !this.isYourTurn()) {
      return;
    }
    this.peerController.initializeDeck(this.table.playerOrder, this.table.pile);
  }

  isYourTurn(): boolean {
    return this.table.whoseTurn === this.user.value;
  }

  playerHasCards(player: string) {
    return Boolean(
      this.table.players[player].cards.length +
        this.table.players[player].encryptedCards.length
    );
  }

  decryptCards(data: {
    decryptedCards: Card[];
    encryptedCards: EncryptedCard[];
  }) {
    this.addEncryptedCardsToHand(data.encryptedCards, data.decryptedCards);
    this.sendTableUpdate();
  }

  reorderHand(hand: Card[]) {
    this.myHand = hand;
    sessionStorage.setItem("hand", JSON.stringify(this.myHand));
  }

  addEncryptedCardsToHand(encryptedCards: EncryptedCard[], cards: Card[]) {
    encryptedCards.forEach((encryptedCard, i) => {
      const card = cards[i];
      this.decryptedMap[encryptedCard.id] = card.id;
      this.table.players[this.user.value!].encryptedCards.push(encryptedCard);
      this.myHand.push(card);
    });
    sessionStorage.setItem("decryptedMap", JSON.stringify(this.decryptedMap));
    sessionStorage.setItem("hand", JSON.stringify(this.myHand));
  }

  addCardsToHand(cards: Card[]) {
    this.table.players[this.user.value!].cards =
      this.table.players[this.user.value!].cards.concat(cards);
    this.myHand = this.myHand.concat(cards);
    sessionStorage.setItem("hand", JSON.stringify(this.myHand));
  }

  removeCardsFromHand(cards: Card[]) {
    const user = this.user.value!;
    this.table.players[user].encryptedCards = this.table.players[
      user
    ].encryptedCards.filter(
      (e) => !cards.some((c) => c.id == this.decryptedMap[e.id])
    );
    this.table.players[user].cards = this.table.players[user].cards.filter(
      (card) => !cards.some((c) => c.id == card.id)
    );
    this.myHand = this.myHand.filter(
      (card) => !cards.some((c) => c.id == card.id)
    );
    sessionStorage.setItem("hand", JSON.stringify(this.myHand));
  }
}
