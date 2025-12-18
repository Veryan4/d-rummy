import { LitElement, html } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { UserController } from "../../controllers";
import { cardsService, storeService, userService } from "../../services";
import {
  TranslationController,
  routerService,
  toastService,
} from "@veryan/lit-spa";
import { Card, Table, PlayerHand, DecryptedTable } from "../../models";
import { CardHand } from "../../components/hand/hand";
import { styles } from "./audit.styles";

import "../../material-web";
import "../../components/game-card/game-card";
import "../../components/hand/hand";
import "@veryan/lit-spa";

@customElement("card-audit")
class Audit extends LitElement {
  static styles = [styles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);

  private decryptedTablesOverTime: DecryptedTable[] = [];

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
    const decryptedTablesOverTime = storeService.getDecryptedTableOverTime();
    if (decryptedTablesOverTime) {
      this.decryptedTablesOverTime = decryptedTablesOverTime;
    }
  }

  render() {
    return !this.table.whoseTurn
      ? html`<lit-spa-loader></lit-spa-loader>`
      : this.renderGame();
  }

  isAllowed(table: Table): boolean {
    const lastTable = this.tableOverTime.at(-1);
    const playerIndex = table.playerOrder.indexOf(table.whoseTurn);
    const previousPlayer = table.playerOrder.at(playerIndex - 1);

    if (!lastTable || playerIndex < 0) {
      return false;
    }

    // Turn is in order
    if (lastTable.turn != table.turn - 1) {
      return false;
    }

    //Player order is the same
    if (!lastTable.playerOrder.every((p, i) => table.playerOrder[i] == p)) {
      return false;
    }

    // Player turn order respected
    if (lastTable.whoseTurn != previousPlayer) {
      return false;
    }

    // will need to check equality of each card in order in audit for deck
    if (
      lastTable.deck.length != table.deck.length - 1 &&
      table.pile.length != 1 // cards were taken from both deck and pile
    ) {
      return false;
    }
    if (
      lastTable.turn != 0 && // what happens if deck re-shuffle?
      table.pile.length == 1 &&
      lastTable.deck.length != table.deck.length
    ) {
      return false; // cards were taken from both deck and pile
    }

    if (
      lastTable.playerOrder.some((player) => {
        if (player != previousPlayer) {
          // All other player sets are valid sets
          const invalidSets = !table.players[player].sets.every((set) =>
            cardsService.isValidRummySet(set)
          );

          // Card changes to other player hands
          const tamperedHands = !cardsService.areSetOfEncryptedCardsEqual(
            lastTable.players[player].encryptedCards,
            table.players[player].encryptedCards
          );

          return invalidSets || tamperedHands;
        }
        return false;
      })
    ) {
      return false;
    }

    // previous players set are valid
    if (
      table.players[previousPlayer].sets.some(
        (set) => !cardsService.isValidRummySet(set)
      )
    ) {
      return false;
    }

    this.tableOverTime.push(table);
    return true;
  }
}
