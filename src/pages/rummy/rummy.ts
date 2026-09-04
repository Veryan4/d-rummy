import { LitElement, html } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { UserController } from "../../controllers";
import {
  rummyService,
  storeService,
  tableService,
} from "../../services";
import {
  TranslationController,
  SoundController,
  toastService,
} from "@veryan/lit-spa";
import { Card } from "../../models";
import { CardHand } from "../../components/hand/hand";
import { spinner } from "../../styles";
import { styles } from "./rummy.styles";
import { GameSession } from "../../games/game-session";
import { getGame } from "../../games/registry";

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
  private session: GameSession;

  @query("card-hand")
  cardHand: CardHand;

  @state()
  private showPileWarning = false;

  constructor() {
    super();
    const definition = getGame("rummy");
    this.session = new GameSession(
      this,
      this.user.value!,
      {
        isGameOver: definition.isGameOver,
        dealInitialCards: definition.dealInitialCards,
        cheatDetection: definition.cheatDetection,
        shouldDeal: (table) => table.turn == 0 && !table.hasDrawn,
        shouldCheatCheck: (previous, next) =>
          previous.turn < next.turn && !next.hasDrawn,
        shouldPlayTurnSound: (table) => !table.hasDrawn,
        shouldToastYourTurn: (table, user) =>
          table.whoseTurn === user && !table.hasDrawn,
        getNextRematchPlayerOrder: definition.getNextRematchPlayerOrder,
        yourTurnKey: "rummy.you",
        onUnselectAll: () => this.cardHand?.unselectAll(),
        onHandChanged: (hand) => this.cardHand?.setCards(hand),
      },
      this.sound,
      { yours: yourTurnSound, theirs: theirTurnSound },
      "rummy",
    );
  }

  get table() {
    return this.session.table;
  }

  get myHand() {
    return this.session.myHand;
  }

  set myHand(value: Card[]) {
    this.session.myHand = value;
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
                        ></game-card>`,
                    )}
                  </div>`,
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
            .selectionPolicy=${"set"}
            @reordered=${(e: CustomEvent) => this.reorderHand(e.detail.hand)}
          ></card-hand>
        </div>
      </div>
      ${this.renderGameWinner()} ${this.renderCheatDetected()}
      ${this.renderPileWarning()}
    `;
  }

  renderYourTurn() {
    const turn = this.isYourTurn()
      ? this.i18n.t("rummy.you")
      : this.i18n.t("rummy.them", {
          user: this.table.whoseTurn.split("-")[0],
        });
    return html`<h1>${this.i18n.t("games.rummy")} — ${turn}</h1>`;
  }

  renderDeck() {
    return this.table.deck.length > 0
      ? html`<game-card
          class="small"
          symbol="♠"
          rank="2"
          .unrevealed=${true}
        ></game-card>`
      : html`<div class="empty-card">
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
    return this.session.others.map((other) => {
      const src = "https://api.dicebear.com/7.x/pixel-art/svg?seed=" + other;
      const classes = {
        active: other == this.table.whoseTurn,
        error: !this.table.players[other].connected,
      };
      const username = other.split("-")[0];
      return html`
        <div class="other ${classMap(classes)}">
          <div class="other-info">
            <img class="player-image" src=${src} alt="avatar" />
            <div class="other-name ${classMap(classes)}">
              ${this.table.players[other].connected
                ? html`${this.i18n.t("rummy.player", {
                    player: username,
                    amount:
                      this.table.players[other].encryptedCards.length +
                      this.table.players[other].cards.length,
                  })}`
                : html`${this.i18n.t("rummy.disconnected", {
                    player: username,
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
                          ></game-card>`,
                      )}
                    </div>`,
                )
              : html` <div class="set empty">
                  ${this.i18n.t("rummy.no_set")}
                </div>`}
          </div>
        </div>
        ${other !== this.table.whoseTurn &&
        other !== this.session.others[this.session.others.length - 1]
          ? html`<hr />`
          : ""}
      `;
    });
  }

  renderGameWinner() {
    return this.session.winner
      ? html` <div class="winner-overlay">
          <div class="winner-modal">
            <div class="winner-text">
              <b>${this.session.winner.split("-")[0]}</b> ${this.i18n.t("rummy.win")}
            </div>
            ${this.session.infractionFound
              ? html`<div class="audit-infraction">
                  ${this.i18n.t("audit.infractionDetected")}
                </div>`
              : ""}
            <div class="winner-buttons">
              <md-filled-button
                style="margin-right:1rem;"
                @click=${() => this.session.rematch()}
                >${this.i18n.t("rummy.rematch")}</md-filled-button
              >
              <md-filled-button
                style="margin-right:1rem;"
                ?disabled=${!this.session.isAuditEnabled}
                @click=${() => this.session.sendToAudit()}
                >${!this.session.isAuditEnabled ? spinner() : ""}
                ${this.i18n.t("rummy.audit")}</md-filled-button
              >
              <md-filled-button @click=${() => this.session.returnToLobby()}
                >${this.i18n.t("rummy.return")}</md-filled-button
              >
            </div>
          </div>
        </div>`
      : "";
  }

  renderCheatDetected() {
    return this.session.cheat
      ? html` <div class="winner-overlay">
          <div class="winner-modal">
            <div class="winner-text">
              <b>${this.i18n.t("audit.cheatDetection")}</b>:
              ${this.i18n.t("audit.cheat." + this.session.cheat)}
            </div>
            <div class="winner-buttons">
              <md-filled-button
                style="margin-right:1rem;"
                ?disabled=${!this.session.isAuditEnabled}
                @click=${() => this.session.sendToAudit()}
                >${this.i18n.t("rummy.audit")}</md-filled-button
              >
              <md-filled-button @click=${() => this.session.returnToLobby()}
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

  async connectedCallback(): Promise<void> {
    super.connectedCallback();
    window.onbeforeunload = () => {
      this.session.disconnect();
    };
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.session.disconnect();
  }

  drawFromDeck(): void {
    const check = rummyService.canDrawFromDeck(this.table, this.user.value!);
    if (!check.allowed) {
      if (check.error) {
        this.sound.play(errorSound);
        toastService.newError(check.error);
      } else if (check.needsFlip) {
        this.flipPileToDeck();
      }
      return;
    }
    const cardsToDecrypt = tableService.drawFromDeck(this.table);
    this.session.decryptPurpose = "hand";
    this.session.peerController.decryptCards(cardsToDecrypt);
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
    const check = rummyService.canDrawFromPile(this.table, this.user.value!);
    if (!check.allowed) {
      if (check.error) {
        this.sound.play(errorSound);
        toastService.newError(check.error);
      }
      return;
    }
    const { newHand } = rummyService.drawFromPile(
      this.table,
      this.user.value!,
      this.myHand,
    );
    this.myHand = newHand;
    this.session.sendTableUpdate();
    this.showPileWarning = false;
  }

  placeOthersSet(cards: Card[], otherPlayer: string) {
    this.placeSet(cards, otherPlayer);
  }

  placeSet(cards: Card[], otherPlayer?: string) {
    const selected = this.cardHand.getSelectedCards();
    const result = rummyService.placeSet(
      this.table,
      this.user.value!,
      selected,
      cards,
      this.myHand,
      this.session.decryptedMap,
      otherPlayer,
    );

    if (!result.success) {
      this.sound.play(errorSound);
      if (result.error) {
        toastService.newError(result.error);
      }
      return false;
    }

    this.myHand = result.newHand!;
    if (result.toastMessage) {
      toastService.newToast(result.toastMessage, result.toastParams);
    }
    this.session.sendTableUpdate();
    return true;
  }

  placeNewSet() {
    const selected = this.cardHand.getSelectedCards();
    const result = rummyService.placeNewSet(
      this.table,
      this.user.value!,
      selected,
      this.myHand,
      this.session.decryptedMap,
    );

    if (!result.success) {
      this.sound.play(errorSound);
      if (result.error) {
        toastService.newError(result.error);
      }
      return;
    }

    this.myHand = result.newHand!;
    this.cardHand.unselectAll();
    this.session.sendTableUpdate();
  }

  discardToPile(): void {
    const selected = this.cardHand.getSelectedCards();
    const validation = rummyService.validateDiscard(
      this.table,
      this.user.value!,
      selected,
    );

    if (!validation.valid) {
      if (validation.error) {
        this.sound.play(errorSound);
        toastService.newError(validation.error);
      }
      return;
    }

    const card = selected[0];
    this.cardHand.unselectAll();
    const { newTable, newHand } = tableService.discardToPile(
      this.table,
      this.user.value!,
      card,
      this.myHand,
      this.session.decryptedMap,
    );
    this.session.table = newTable;
    this.myHand = newHand;
    this.session.tableOverTime.push(structuredClone(this.table));
    this.session.sendTableUpdate();
  }

  flipPileToDeck() {
    if (this.table.hasDrawn || !this.isYourTurn()) {
      return;
    }
    this.session.peerController.deckFLipped(
      this.table.playerOrder,
      this.table.pile,
    );
  }

  isYourTurn(): boolean {
    return this.session.isYourTurn();
  }

  reorderHand(hand: Card[]) {
    this.myHand = hand;
    storeService.setHand(this.myHand);
  }
}
