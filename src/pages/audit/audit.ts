import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { storeService } from "../../services";
import { TranslationController } from "@veryan/lit-spa";
import { Audit, Card, DecryptedTable } from "../../models";
import { styles } from "./audit.styles";

import "../../material-web";
import "../../components/game-card/game-card";
import "../../components/hand/hand";
import "@veryan/lit-spa";

@customElement("card-audit")
class AuditTable extends LitElement {
  static styles = [styles];

  private i18n = new TranslationController(this);
  private decryptedTablesOverTime: DecryptedTable[] = [];
  private audit: Audit[] = [];

  @state()
  private selectedTurn = 0;

  @state()
  private hiddenCards: Card[] = [];

  constructor() {
    super();
    const { decryptedTablesOverTime, audit } = storeService.getAuditState();
    if (decryptedTablesOverTime) {
      this.decryptedTablesOverTime = decryptedTablesOverTime;
      this.audit = audit;
    }
  }

  render() {
    const table = this.decryptedTablesOverTime[this.selectedTurn];
    return html`
      <div class="audit-wrapper">
        <div class="table">
          ${this.goToInfractions()}
          <h1>${this.i18n.t("audit.turn", { turn: String(table.turn) })}</h1>
          ${this.renderInfractions()} ${this.renderGame(table)}
        </div>
      </div>
      ${this.renderHiddenCards()}
    `;
  }

  renderGame(table: DecryptedTable) {
    return html`
      <div class="audit-header">
        <div class="deck">
          <h3>${this.i18n.t("rummy.deck")}</h3>
          <div class="row">
            ${this.renderDeck(table)}
            <div class="count">${table.deck.length}</div>
          </div>
        </div>
        <div class="pile">
          <h3>${this.i18n.t("rummy.pile")}</h3>
          <div class="row">
            ${this.renderPile(table)}
            <div class="count">${table.pile.length}</div>
          </div>
        </div>
      </div>
      <div class="others">${this.renderPlayers(table)}</div>
      <div class="turns">
        <md-filled-button
          ?disabled=${this.selectedTurn == 0}
          @click=${() => (this.selectedTurn -= 1)}
        >
          < ${this.i18n.t("audit.previous")}
        </md-filled-button>
        <md-filled-button
          ?disabled=${this.selectedTurn ==
          this.decryptedTablesOverTime?.at(-1)?.turn}
          @click=${() => (this.selectedTurn += 1)}
        >
          ${this.i18n.t("audit.next")} >
        </md-filled-button>
      </div>
    `;
  }

  goToInfractions() {
    const foundInfraction = this.audit.findIndex((a) => a.infractions.length);
    return foundInfraction > -1 && foundInfraction != this.selectedTurn
      ? html`
          <md-filled-button
            class="infraction-btn"
            style="margin-right:1rem;width: fit-content;"
            @click=${() => (this.selectedTurn = foundInfraction)}
          >
            ${this.i18n.t("audit.foundInfraction")}</md-filled-button
          >
        `
      : "";
  }

  renderInfractions() {
    const audit = this.audit[this.selectedTurn];
    return audit?.infractions?.length
      ? html`<ul class="infractions">
          ${audit.infractions.map(
            (i) => html`<li>${this.i18n.t("audit.infraction." + i)}</li>`
          )}
        </ul>`
      : "";
  }

  renderDeck(table: DecryptedTable) {
    return table.deck.length > 0
      ? html`<game-card
          class="small"
          symbol="♠"
          rank="2"
          .unrevealed=${true}
          @click=${() => (this.hiddenCards = table.deck)}
        ></game-card>`
      : html`<div class="empty-card">
          ${this.i18n.t("rummy.flip_discard")}
        </div>`;
  }

  renderHiddenCards() {
    return this.hiddenCards?.length
      ? html`
          <div class="hidden" @click=${() => (this.hiddenCards = [])}>
            <div class="hidden-cards">
              ${this.hiddenCards.map(
                (card) =>
                  html`<game-card
                    class="small"
                    symbol="${card.symbol}"
                    rank="${card.rank}"
                  ></game-card>`
              )}
            </div>
          </div>
        `
      : html``;
  }

  renderPile(table: DecryptedTable) {
    let topCard = null;
    if (table.pile.length > 0) {
      topCard = table.pile[table.pile.length - 1];
    }
    return topCard
      ? html`<game-card
          class="small"
          symbol="${topCard.symbol}"
          rank="${topCard.rank}"
          @click=${() => (this.hiddenCards = table.pile)}
        ></game-card>`
      : html`<div class="empty-card">${this.i18n.t("rummy.empty")}</div>`;
  }

  renderPlayers(table: DecryptedTable) {
    return table.playerOrder.map((player) => {
      const src = "https://api.dicebear.com/7.x/pixel-art/svg?seed=" + player;
      const classes = {
        active: player == table.whoseTurn,
      };
      return html`
        <div class="other ${classMap(classes)}">
          <div class="other-info">
            <img class="player-image" src=${src} alt="avatar" />
            <div class="other-name ${classMap(classes)}">
              ${player == table.whoseTurn
                ? this.i18n.t("rummy.them", { user: table.whoseTurn })
                : player}
            </div>
          </div>
          <div class="other-hand">
            <h3>${this.i18n.t("rummy.hand")}</h3>
            <div class="hand">
              ${table.players[player]?.cards?.length > 0
                ? table.players[player].cards.map(
                    (card) =>
                      html`<game-card
                        class="small"
                        symbol="${card.symbol}"
                        rank="${card.rank}"
                      ></game-card>`
                  )
                : html``}
            </div>
          </div>
          <h3>${this.i18n.t("audit.sets")}</h3>
          <div class="other-sets">
            ${table.players[player].sets &&
            table.players[player].sets.length > 0
              ? table.players[player].sets.map(
                  (set) =>
                    html` <div
                      class="set ${classMap({ ["set-" + set.length]: true })}"
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
        ${player !== table.whoseTurn && player !== table.playerOrder.at(-1)
          ? html`<hr />`
          : ""}
      `;
    });
  }
}
