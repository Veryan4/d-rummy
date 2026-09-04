import { CheatEnum, Table } from "../../models";
import { cardsService } from "../../services/cards.service";
import { rummyService } from "../../services/rummy.service";

export function rummyCheatDetection(
  table: Table,
  lastTable: Table,
): CheatEnum | null {
  const playerIndex = table.playerOrder.indexOf(table.whoseTurn);
  const previousPlayer = table.playerOrder.at(playerIndex - 1);

  if (!lastTable || playerIndex < 0) {
    return CheatEnum.unableToCheatDetect;
  }

  if (lastTable.turn != table.turn - 1) {
    return CheatEnum.outOfOrderTurns;
  }

  if (!lastTable.playerOrder.every((p, i) => table.playerOrder[i] == p)) {
    return CheatEnum.playerTurnOrderChanged;
  }

  if (lastTable.whoseTurn != previousPlayer) {
    return CheatEnum.wrongPlayersTurn;
  }

  if (
    lastTable.deck.length != table.deck.length + 1 &&
    lastTable.pile.length == table.pile.length &&
    table.pile.length != 1
  ) {
    return CheatEnum.cardsTakenFromPileAndDeck;
  }

  if (
    lastTable.playerOrder.some(
      (player) =>
        player != previousPlayer &&
        !cardsService.areSetOfEncryptedCardsEqual(
          lastTable.players[player].encryptedCards,
          table.players[player].encryptedCards,
        ),
    )
  ) {
    return CheatEnum.otherPlayersHandsChanged;
  }

  if (
    lastTable.playerOrder.some(
      (player) =>
        player != previousPlayer &&
        !table.players[player].sets.every((set) =>
          rummyService.isValidRummySet(set),
        ),
    )
  ) {
    return CheatEnum.setsNotValid;
  }

  if (
    table.players[previousPlayer].sets.some(
      (set) => !rummyService.isValidRummySet(set),
    )
  ) {
    return CheatEnum.setsNotValid;
  }

  return null;
}
