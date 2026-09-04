import { Card, EncryptedCard, SymbolType, Table } from "../../models";
import { cardsService } from "../../services/cards.service";
import { tableService } from "../../services/table.service";

export const crazyEightsService = {
  dealCount,
  dealInitialCards,
  isGameOver,
  getNextRematchPlayerOrder,
  shouldTakeUpcard,
  takeUpcardFromDeck,
  applyUpcard,
  isEight,
  isQueen,
  isAce,
  isTwo,
  topCard,
  isLegalPlay,
  legalCards,
  canDraw,
  canPass,
  canPlay,
  playCard,
  passTurn,
  finishPenalty,
  nextPlayerAfter,
  applySpecials,
  playerSkippedByQueen,
  recyclePile,
  recyclePileCards,
  ensureState,
};

function dealCount(playerCount: number): number {
  return playerCount === 2 ? 7 : 5;
}

function getNextRematchPlayerOrder(playerOrder: string[]): string[] {
  const nextOrder = [...playerOrder];
  if (nextOrder.length > 0) {
    nextOrder.push(nextOrder.shift()!);
  }
  return nextOrder;
}

function dealInitialCards(table: Table, user: string): EncryptedCard[] | null {
  if (tableService.playerHasCards(table, user)) {
    return null;
  }
  const count = dealCount(table.playerOrder.length);
  let cardsToDecrypt: EncryptedCard[] | null = null;
  table.playerOrder.some((player, i) => {
    if (
      (i == 0 ||
        table.players[table.playerOrder[i - 1]].encryptedCards.length) &&
      player === user
    ) {
      cardsToDecrypt = [];
      cardsService.moveCards(
        table.deck,
        cardsToDecrypt,
        "top",
        "bottom",
        count,
      );
      return true;
    }
    return false;
  });
  return cardsToDecrypt;
}

function isGameOver(table: Table): string | null {
  if (!table?.pile?.length) {
    return null;
  }
  let winner: string | null = null;
  table.playerOrder.forEach((player) => {
    if (!tableService.playerHasCards(table, player)) {
      winner = player;
    }
  });
  return winner;
}

function ensureState(table: Table) {
  if (!table.crazyEights) {
    table.crazyEights = {
      currentSuit: topCard(table)?.symbol ?? "♠",
      direction: 1,
      pendingDraw: 0,
    };
  }
  return table.crazyEights;
}

function topCard(table: Table): Card | undefined {
  return table.pile.at(-1);
}

function isEight(card: Card): boolean {
  return card.rank === "8";
}

function isQueen(card: Card): boolean {
  return card.rank === "q";
}

function isAce(card: Card): boolean {
  return card.rank === "a";
}

function isTwo(card: Card): boolean {
  return card.rank === "2";
}

function isSetupComplete(table: Table): boolean {
  return (
    table.pile.length > 0 &&
    table.playerOrder.every((player) =>
      tableService.playerHasCards(table, player),
    )
  );
}

function shouldTakeUpcard(table: Table, user: string): boolean {
  return (
    user === table.playerOrder[0] &&
    table.pile.length === 0 &&
    table.deck.length > 0 &&
    table.playerOrder.every((player) =>
      tableService.playerHasCards(table, player),
    )
  );
}

function takeUpcardFromDeck(table: Table): EncryptedCard[] {
  const cards: EncryptedCard[] = [];
  cardsService.moveCard(table.deck, cards, "top", "bottom");
  return cards;
}

function applyUpcard(table: Table, card: Card): void {
  card.selected = false;
  table.pile.push(card);
  table.crazyEights = {
    currentSuit: card.symbol,
    direction: 1,
    pendingDraw: 0,
  };
}

function isLegalPlay(table: Table, card: Card): boolean {
  const state = ensureState(table);
  if (state.pendingDraw > 0) {
    return false;
  }
  if (isEight(card)) {
    return true;
  }
  const top = topCard(table);
  if (!top) {
    return false;
  }
  return card.rank === top.rank || card.symbol === state.currentSuit;
}

function legalCards(table: Table, hand: Card[]): Card[] {
  return hand.filter((card) => isLegalPlay(table, card));
}

function canDraw(
  table: Table,
  user: string,
): { allowed: boolean; error?: string; needsRecycle?: boolean } {
  if (!tableService.isYourTurn(table, user)) {
    return { allowed: false, error: "crazyEights.error.wait_your_turn" };
  }
  if (!isSetupComplete(table)) {
    return { allowed: false };
  }
  const state = ensureState(table);
  if (state.pendingDraw > 0) {
    return { allowed: false, error: "crazyEights.error.must_respond_to_draw" };
  }
  if (!table.deck.length) {
    if (table.pile.length > 1) {
      return { allowed: false, needsRecycle: true };
    }
    return { allowed: false, error: "crazyEights.error.deck_empty" };
  }
  return { allowed: true };
}

function canPass(
  table: Table,
  user: string,
  hand: Card[],
): { allowed: boolean; error?: string; needsRecycle?: boolean } {
  if (!tableService.isYourTurn(table, user)) {
    return { allowed: false, error: "crazyEights.error.wait_your_turn" };
  }
  if (!isSetupComplete(table)) {
    return { allowed: false };
  }
  const state = ensureState(table);
  if (state.pendingDraw > 0) {
    return { allowed: false, error: "crazyEights.error.must_respond_to_draw" };
  }
  if (legalCards(table, hand).length > 0) {
    return { allowed: false, error: "crazyEights.error.can_play" };
  }
  if (table.deck.length > 0) {
    return { allowed: false, error: "crazyEights.error.must_draw" };
  }
  if (table.pile.length > 1) {
    return { allowed: false, needsRecycle: true };
  }
  return { allowed: true };
}

function canPlay(
  table: Table,
  user: string,
  card: Card,
  declaredSuit?: SymbolType,
): { allowed: boolean; error?: string } {
  if (!tableService.isYourTurn(table, user)) {
    return { allowed: false, error: "crazyEights.error.wait_your_turn" };
  }
  if (!isSetupComplete(table)) {
    return { allowed: false };
  }
  if (ensureState(table).pendingDraw > 0) {
    return { allowed: false, error: "crazyEights.error.must_respond_to_draw" };
  }
  if (!isLegalPlay(table, card)) {
    return { allowed: false, error: "crazyEights.error.illegal_play" };
  }
  if (isEight(card) && !declaredSuit) {
    return { allowed: false, error: "crazyEights.error.choose_suit" };
  }
  return { allowed: true };
}

function nextIndex(table: Table, fromIndex: number, steps: number): number {
  const n = table.playerOrder.length;
  const dir = ensureState(table).direction;
  return (((fromIndex + dir * steps) % n) + n) % n;
}

function nextPlayerAfter(table: Table, actor: string, skip = 0): string {
  const from = table.playerOrder.indexOf(actor);
  return table.playerOrder[nextIndex(table, from, 1 + skip)];
}

function playerSkippedByQueen(previous: Table, next: Table): string | null {
  if (previous.turn >= next.turn) {
    return null;
  }
  if (isGameOver(next)) {
    return null;
  }
  const played = next.pile.at(-1);
  if (
    !played ||
    !isQueen(played) ||
    next.pile.length !== previous.pile.length + 1
  ) {
    return null;
  }
  const actor = previous.whoseTurn;
  if (!actor) {
    return null;
  }
  const skipped = nextPlayerAfter(next, actor, 0);
  if (next.whoseTurn === skipped) {
    return null;
  }
  return skipped;
}

function applySpecials(
  table: Table,
  card: Card,
  declaredSuit?: SymbolType,
): { skip: number } {
  const state = ensureState(table);
  if (isEight(card)) {
    state.currentSuit = declaredSuit ?? card.symbol;
  } else {
    state.currentSuit = card.symbol;
  }
  let skip = 0;
  if (isTwo(card)) {
    state.pendingDraw += 2;
  }
  if (isAce(card)) {
    state.direction = state.direction === 1 ? -1 : 1;
  }
  if (isQueen(card)) {
    skip = 1;
  }
  return { skip };
}

function playCard(
  table: Table,
  user: string,
  card: Card,
  currentHand: Card[],
  decryptedMap: Map<number, string>,
  declaredSuit?: SymbolType,
): {
  success: boolean;
  error?: string;
  newHand?: Card[];
  winner?: string | null;
} {
  const check = canPlay(table, user, card, declaredSuit);
  if (!check.allowed) {
    return { success: false, error: check.error };
  }

  card.selected = false;
  const { newHand } = tableService.removeCardsFromHand(
    table,
    user,
    currentHand,
    decryptedMap,
    [card],
  );
  table.pile.push(card);

  if (!tableService.playerHasCards(table, user)) {
    table.hasDrawn = false;
    table.turn += 1;
    return { success: true, newHand, winner: user };
  }

  const { skip } = applySpecials(table, card, declaredSuit);
  table.whoseTurn = nextPlayerAfter(table, user, skip);
  table.turn += 1;
  table.hasDrawn = false;
  return { success: true, newHand, winner: null };
}

function passTurn(table: Table, user: string, hand: Card[]): { error?: string } {
  const check = canPass(table, user, hand);
  if (!check.allowed) {
    return { error: check.error };
  }
  table.whoseTurn = nextPlayerAfter(table, user, 0);
  table.turn += 1;
  table.hasDrawn = false;
  return {};
}

function finishPenalty(table: Table, _user: string): void {
  const state = ensureState(table);
  state.pendingDraw = 0;
  table.hasDrawn = true;
}

function recyclePileCards(pile: Card[]): {
  cardsToEncrypt: Card[];
  retained: Card[];
} {
  const top = pile.at(-1);
  if (!top || pile.length < 2) {
    return { cardsToEncrypt: [], retained: top ? [top] : [] };
  }
  return { cardsToEncrypt: pile.slice(0, -1), retained: [top] };
}

function recyclePile(table: Table): { cardsToEncrypt: Card[]; retained: Card[] } {
  const { cardsToEncrypt, retained } = recyclePileCards(table.pile);
  if (!retained.length) {
    return { cardsToEncrypt: [], retained: [] };
  }
  table.pile = retained;
  return { cardsToEncrypt, retained };
}
