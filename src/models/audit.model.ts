export enum CheatEnum {
  unableToCheatDetect = 0,
  outOfOrderTurns = 1,
  playerTurnOrderChanged = 2,
  wrongPlayersTurn = 3,
  cardsTakenFromPileAndDeck = 4,
  setsNotValid = 5,
  otherPlayersHandsChanged = 6,
}

export enum AuditEnum {
  wrongAmountOfTotalCards = 0,
  notAllCardsAreUnique = 1,
  thereIsAnInvalidSet = 2,
}

export class Audit {
  infractions: AuditEnum[];
  turn: number;
}
