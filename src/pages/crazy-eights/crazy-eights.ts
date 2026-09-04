import { LitElement, html } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { UserController } from "../../controllers";
import { storeService, tableService, cardsService } from "../../services";
import {
  TranslationController,
  SoundController,
  toastService,
} from "@veryan/lit-spa";
import { Card, SymbolType, Table } from "../../models";
import { CardHand } from "../../components/hand/hand";
import { spinner } from "../../styles";
import { styles } from "./crazy-eights.styles";
import { GameSession } from "../../games/game-session";
import { crazyEightsService } from "../../games/crazy-eights/rules";
import { isForcedDrawContinuation } from "../../games/crazy-eights/audit";
import { getGame } from "../../games/registry";

import "../../material-web";
import "../../components/game-card/game-card";
import "../../components/hand/hand";
import "@veryan/lit-spa";

const yourTurnSound = new Audio("/sounds/your_turn.mp3");
const theirTurnSound = new Audio("/sounds/their_turn.mp3");
const errorSound = new Audio("/sounds/error.mp3");

const SUITS: SymbolType[] = ["♠", "♥", "♣", "♦"];

function shouldCheckCrazyEightsCheat(previous: Table, next: Table): boolean {
  if (next.turn === 0) {
    return false;
  }
  const strip = (table: Table): Table => {
    const copy = structuredClone(table);
    Object.values(copy.players).forEach((hand) => {
      hand.connected = true;
    });
    return copy;
  };
  return !cardsService.areTablesEqual(strip(previous), strip(next));
}

@customElement("card-crazy-eights")
class CrazyEightsPage extends LitElement {
  static styles = styles;

  private i18n = new TranslationController(this);
  private user = new UserController(this);
  private sound = new SoundController(this);
  private session: GameSession;

  @query("card-hand")
  cardHand: CardHand;

  @state()
  private pendingEight: Card | null = null;

  private penaltyDrawInFlight = false;
  private penaltyDrawnThisTurn = 0;
  private drawInFlight = false;

  constructor() {
    super();
    const definition = getGame("crazy-eights");
    this.session = new GameSession(
      this,
      this.user.value!,
      {
        isGameOver: definition.isGameOver,
        dealInitialCards: definition.dealInitialCards,
        cheatDetection: definition.cheatDetection,
        shouldDeal: (table) => table.turn == 0 && !table.hasDrawn,
        shouldCheatCheck: shouldCheckCrazyEightsCheat,
        shouldFoldSnapshot: isForcedDrawContinuation,
        shouldPlayTurnSound: (table) => !table.hasDrawn,
        shouldToastYourTurn: (table, user) =>
          table.whoseTurn === user &&
          !table.hasDrawn &&
          !(table.crazyEights?.pendingDraw),
        getNextRematchPlayerOrder: definition.getNextRematchPlayerOrder,
        yourTurnKey: "crazyEights.you",
        onUnselectAll: () => this.cardHand?.unselectAll(),
        onHandChanged: (hand) => this.cardHand?.setCards(hand),
        afterApply: (session, previous) => this.afterApply(session, previous),
        onDecrypted: (session, data) => this.onDecrypted(session, data),
      },
      this.sound,
      { yours: yourTurnSound, theirs: theirTurnSound },
      "crazy-eights",
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

  get state() {
    return crazyEightsService.ensureState(this.table);
  }

  render() {
    return !this.table.whoseTurn
      ? html`<lit-spa-loader></lit-spa-loader>`
      : this.renderGame();
  }

  renderGame() {
    const pending = this.state.pendingDraw;
    return html`
      ${this.renderYourTurn()}
      <div class="table-wrapper">
        <div class="first-half">
          <div class="status-row">
            <div class="status-item"
              >${this.i18n.t("crazyEights.current_suit")}:
              <span class="current-suit">${this.state.currentSuit}</span>
            </div>
            <div class="status-item"
              >${this.i18n.t("crazyEights.direction")}:
              <span class="direction">${this.state.direction === 1
                ? this.i18n.t("crazyEights.clockwise")
                : this.i18n.t("crazyEights.counterclockwise")}</span>
            </div>
            ${pending
              ? html`<div class="status-item"
                  >${this.i18n.t("crazyEights.pending_draw", {
                    count: String(pending),
                  })}</div
                >`
              : ""}
          </div>
          <div class="table">
            <div class="deck" @click=${this.onDeckClick}>
              <h3>${this.i18n.t("crazyEights.deck")}</h3>
              <div class="row">
                ${this.renderDeck()}
                <div class="count">${this.table.deck.length}</div>
              </div>
            </div>
            <div class="pile" @click=${this.onPileClick}>
              <h3>${this.i18n.t("crazyEights.pile")}</h3>
              <div class="row">
                ${this.renderPile()}
                <div class="count">${this.table.pile.length}</div>
              </div>
            </div>
          </div>
          ${this.renderActions()}
        </div>
        <div class="second-half">
          <div>
            <h3>${this.i18n.t("crazyEights.others")}</h3>
            <div class="others">${this.renderOthers()}</div>
          </div>
        </div>
      </div>
      <div class="hand-section">
        <h3>${this.i18n.t("crazyEights.hand")}</h3>
        <card-hand
          .selectionPolicy=${"single"}
          .locked=${this.state.pendingDraw > 0}
          @reordered=${(e: CustomEvent) => this.reorderHand(e.detail.hand)}
        ></card-hand>
      </div>
      ${this.renderGameWinner()} ${this.renderCheatDetected()}
      ${this.renderSuitPicker()}
    `;
  }

  renderActions() {
    if (!this.isYourTurn()) {
      return "";
    }
    const pass = crazyEightsService.canPass(
      this.table,
      this.user.value!,
      this.myHand,
    );
    return html`<div class="actions">
      ${pass.allowed || pass.needsRecycle
        ? html`<md-outlined-button @click=${this.onPass}
            >${this.i18n.t("crazyEights.pass")}</md-outlined-button
          >`
        : ""}
    </div>`;
  }

  renderYourTurn() {
    const turn = this.isYourTurn()
      ? this.i18n.t("crazyEights.you")
      : this.i18n.t("crazyEights.them", {
          user: this.table.whoseTurn.split("-")[0],
        });
    return html`<h1>${this.i18n.t("games.crazyEights")} — ${turn}</h1>`;
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
          ${this.i18n.t("crazyEights.flip_discard")}
        </div>`;
  }

  renderPile() {
    const topCard = this.table.pile.at(-1);
    return topCard
      ? html`<game-card
          class="small"
          symbol="${topCard.symbol}"
          rank="${topCard.rank}"
        ></game-card>`
      : html`<div class="empty-card">${this.i18n.t("crazyEights.empty")}</div>`;
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
                ? html`${this.i18n.t("crazyEights.player", {
                    player: username,
                    amount:
                      this.table.players[other].encryptedCards.length +
                      this.table.players[other].cards.length,
                  })}`
                : html`${this.i18n.t("crazyEights.disconnected", {
                    player: username,
                  })}`}
            </div>
          </div>
        </div>
      `;
    });
  }

  renderGameWinner() {
    return this.session.winner
      ? html` <div class="winner-overlay">
          <div class="winner-modal">
            <div class="winner-text">
              <b>${this.session.winner.split("-")[0]}</b> ${this.i18n.t("crazyEights.win")}
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
                >${this.i18n.t("crazyEights.rematch")}</md-filled-button
              >
              <md-filled-button
                style="margin-right:1rem;"
                ?disabled=${!this.session.isAuditEnabled}
                @click=${() => this.session.sendToAudit()}
                >${!this.session.isAuditEnabled ? spinner() : ""}
                ${this.i18n.t("crazyEights.audit")}</md-filled-button
              >
              <md-filled-button @click=${() => this.session.returnToLobby()}
                >${this.i18n.t("crazyEights.return")}</md-filled-button
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
                >${this.i18n.t("crazyEights.audit")}</md-filled-button
              >
              <md-filled-button @click=${() => this.session.returnToLobby()}
                >${this.i18n.t("crazyEights.return")}</md-filled-button
              >
            </div>
          </div>
        </div>`
      : "";
  }

  renderSuitPicker() {
    return this.pendingEight
      ? html` <div class="winner-overlay">
          <div class="winner-modal">
            <div class="winner-text">
              ${this.i18n.t("crazyEights.choose_suit")}
            </div>
            <div class="suit-picker">
              ${SUITS.map(
                (suit) => html`
                  <md-filled-button
                    class="suit-btn"
                    @click=${() => this.confirmEight(suit)}
                    >${suit}</md-filled-button
                  >
                `,
              )}
            </div>
            <div class="winner-buttons">
              <md-outlined-button @click=${this.cancelEight}
                >${this.i18n.t("crazyEights.cancel")}</md-outlined-button
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

  protected updated(): void {
    this.maybeAutoDrawPenalty();
  }

  afterApply(session: GameSession, previous: Table) {
    const skipped = crazyEightsService.playerSkippedByQueen(
      previous,
      session.table,
    );
    if (skipped === session.user) {
      toastService.newToast("crazyEights.turn_skipped");
    }
    if (
      crazyEightsService.shouldTakeUpcard(session.table, session.user) &&
      !session.upcardRequested
    ) {
      session.upcardRequested = true;
      session.decryptPurpose = "upcard";
      session.peerController.decryptCards(
        crazyEightsService.takeUpcardFromDeck(session.table),
      );
    }
    if (session.table.deck.length > 0) {
      session.recycleInFlight = false;
    }
    if (
      session.penaltyAfterRecycle &&
      session.table.deck.length > 0 &&
      session.table.crazyEights?.pendingDraw
    ) {
      session.penaltyAfterRecycle = false;
      this.drawPenalty();
      return;
    }
    this.maybeAutoDrawPenalty();
  }

  onDecrypted(
    session: GameSession,
    data: { decryptedCards: Card[]; encryptedCards: import("../../models").EncryptedCard[] },
  ): boolean {
    if (session.decryptPurpose === "upcard") {
      crazyEightsService.applyUpcard(session.table, data.decryptedCards[0]);
      session.decryptPurpose = "hand";
      session.sendTableUpdate();
      return true;
    }
    if (session.decryptPurpose === "penalty") {
      const { newHand } = tableService.addEncryptedCardsToHand(
        session.table,
        this.user.value!,
        session.myHand,
        session.decryptedMap,
        data.encryptedCards,
        data.decryptedCards,
      );
      session.myHand = newHand;
      this.cardHand?.setCards(newHand);
      this.requestUpdate();
      const state = crazyEightsService.ensureState(session.table);
      state.pendingDraw = Math.max(
        0,
        state.pendingDraw - data.decryptedCards.length,
      );
      this.penaltyDrawnThisTurn += data.decryptedCards.length;
      this.penaltyDrawInFlight = false;
      if (state.pendingDraw > 0) {
        this.drawPenalty();
        return true;
      }
      if (this.penaltyDrawnThisTurn > 0) {
        toastService.newToast("crazyEights.forced_draw", {
          count: String(this.penaltyDrawnThisTurn),
        });
        this.penaltyDrawnThisTurn = 0;
      }
      crazyEightsService.finishPenalty(session.table, this.user.value!);
      session.recordSnapshot(session.table);
      session.sendTableUpdate();
      return true;
    }
    this.drawInFlight = false;
    return false;
  }

  onDeckClick() {
    if (
      this.state.pendingDraw > 0 ||
      this.session.recycleInFlight ||
      this.drawInFlight
    ) {
      return;
    }
    const check = crazyEightsService.canDraw(this.table, this.user.value!);
    if (!check.allowed) {
      if (check.needsRecycle) {
        this.recycle();
        return;
      }
      if (check.error) {
        this.sound.play(errorSound);
        toastService.newError(check.error);
      }
      return;
    }
    this.drawInFlight = true;
    this.table.hasDrawn = true;
    this.session.decryptPurpose = "hand";
    this.session.peerController.decryptCards(
      tableService.takeFromDeck(this.table, 1),
    );
  }

  maybeAutoDrawPenalty() {
    if (!this.isYourTurn() || this.state.pendingDraw <= 0) {
      return;
    }
    if (this.penaltyDrawInFlight || this.session.penaltyAfterRecycle || this.session.recycleInFlight) {
      return;
    }
    this.drawPenalty();
  }

  drawPenalty() {
    if (!this.isYourTurn() || this.state.pendingDraw <= 0) {
      return;
    }
    if (this.penaltyDrawInFlight) {
      return;
    }
    this.penaltyDrawInFlight = true;
    if (!this.table.deck.length) {
      this.penaltyDrawInFlight = false;
      if (this.table.pile.length > 1) {
        this.session.penaltyAfterRecycle = true;
        this.recycle();
        return;
      }
      crazyEightsService.finishPenalty(this.table, this.user.value!);
      this.session.recordSnapshot(this.table);
      this.session.sendTableUpdate();
      return;
    }
    this.table.hasDrawn = true;
    this.session.decryptPurpose = "penalty";
    this.session.peerController.decryptCards(
      tableService.takeFromDeck(this.table, this.state.pendingDraw),
    );
  }

  recycle() {
    if (this.session.recycleInFlight) {
      return;
    }
    const { cardsToEncrypt, retained } = crazyEightsService.recyclePileCards(
      this.table.pile,
    );
    if (!cardsToEncrypt.length) {
      return;
    }
    this.session.recycleInFlight = true;
    this.session.peerController.recycleDeck(
      this.table.playerOrder,
      cardsToEncrypt,
      retained,
    );
  }

  onPileClick() {
    if (this.state.pendingDraw > 0 || this.drawInFlight) {
      return;
    }
    const selected = this.cardHand?.getSelectedCards() ?? [];
    if (selected.length !== 1) {
      this.sound.play(errorSound);
      toastService.newError("crazyEights.error.select_card");
      return;
    }
    const card = selected[0];
    if (crazyEightsService.isEight(card)) {
      const check = crazyEightsService.canPlay(
        this.table,
        this.user.value!,
        card,
      );
      if (!check.allowed && check.error !== "crazyEights.error.choose_suit") {
        this.sound.play(errorSound);
        if (check.error) {
          toastService.newError(check.error);
        }
        return;
      }
      this.pendingEight = card;
      return;
    }
    this.play(card);
  }

  confirmEight(suit: SymbolType) {
    const card = this.pendingEight;
    this.pendingEight = null;
    if (card) {
      this.play(card, suit);
    }
  }

  cancelEight() {
    this.pendingEight = null;
  }

  play(card: Card, declaredSuit?: SymbolType) {
    const result = crazyEightsService.playCard(
      this.table,
      this.user.value!,
      card,
      this.myHand,
      this.session.decryptedMap,
      declaredSuit,
    );
    if (!result.success) {
      this.sound.play(errorSound);
      if (result.error) {
        toastService.newError(result.error);
      }
      return;
    }
    this.myHand = result.newHand!;
    this.cardHand?.unselectAll();
    this.session.recordSnapshot(this.table);
    this.session.sendTableUpdate();
  }

  onPass() {
    if (
      this.state.pendingDraw > 0 ||
      this.session.recycleInFlight ||
      this.drawInFlight
    ) {
      return;
    }
    const check = crazyEightsService.canPass(
      this.table,
      this.user.value!,
      this.myHand,
    );
    if (check.needsRecycle) {
      this.recycle();
      return;
    }
    const result = crazyEightsService.passTurn(
      this.table,
      this.user.value!,
      this.myHand,
    );
    if (result.error) {
      this.sound.play(errorSound);
      toastService.newError(result.error);
      return;
    }
    this.session.recordSnapshot(this.table);
    this.session.sendTableUpdate();
  }

  isYourTurn(): boolean {
    return this.session.isYourTurn();
  }

  reorderHand(hand: Card[]) {
    this.myHand = hand;
    storeService.setHand(this.myHand);
  }
}
