import { Card, EncryptedCard, Table } from "../models";
import { cardsService } from "./cards.service";
import { tableService } from "./table.service";

export const rummyService = {
  isGameOver,
  getNextRematchPlayerOrder,
  dealInitialCards,
  canDrawFromDeck,
  canDrawFromPile,
  drawFromPile,
  formatSet,
  placeSet,
  placeNewSet,
  validateDiscard,
  isValidRummySet,
};

function isGameOver(table: Table): string | null {
  if (!table?.turn) return null;
  let gameOver = null;
  table.playerOrder.forEach((player) => {
    if (!tableService.playerHasCards(table, player)) {
      gameOver = player;
    }
  });
  return gameOver;
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
  let cardsToDecrypt: EncryptedCard[] | null = null;
  table.playerOrder.some((player, i) => {
    if (
      (i == 0 ||
        table.players[table.playerOrder[i - 1]].encryptedCards.length) &&
      player === user
    ) {
      cardsToDecrypt = [];
      cardsService.moveCards(table.deck, cardsToDecrypt, "top", "bottom", 7);
      return true;
    }
    return false;
  });
  return cardsToDecrypt;
}

function canDrawFromDeck(
  table: Table,
  user: string,
): { allowed: boolean; error?: string; needsFlip?: boolean } {
  if (
    table.hasDrawn ||
    table.playerOrder.some(
      (player) => !tableService.playerHasCards(table, player),
    )
  ) {
    return { allowed: false };
  }
  if (!tableService.isYourTurn(table, user)) {
    return { allowed: false, error: "rummy.error.wait_your_turn" };
  }
  if (!table.deck.length) {
    return { allowed: false, needsFlip: true };
  }
  return { allowed: true };
}

function canDrawFromPile(
  table: Table,
  user: string,
): { allowed: boolean; error?: string } {
  if (table.hasDrawn || table.pile.length === 0) {
    return { allowed: false };
  }
  if (!tableService.isYourTurn(table, user)) {
    return { allowed: false, error: "rummy.error.wait_your_turn" };
  }
  return { allowed: true };
}

function drawFromPile(
  table: Table,
  user: string,
  currentHand: Card[],
): { newHand: Card[] } {
  const result = tableService.addCardsToHand(
    table,
    user,
    currentHand,
    table.pile,
  );
  table.pile = [];
  table.hasDrawn = true;
  return result;
}

function formatSet(cards: Card[]): Card[] {
  const set = cards.map((card) => {
    card.selected = false;
    return card;
  });
  return [...new Set(set)].sort((a, b) =>
    a.value > b.value ? 1 : b.value > a.value ? -1 : 0,
  );
}

function placeSet(
  table: Table,
  user: string,
  selectedCards: Card[],
  targetSetCards: Card[],
  currentHand: Card[],
  decryptedMap: Map<number, string>,
  otherPlayer?: string,
): {
  success: boolean;
  error?: string;
  newHand?: Card[];
  toastMessage?: string;
  toastParams?: Record<string, string>;
} {
  if (otherPlayer && table.players[user].sets.length === 0) {
    return { success: false, error: "rummy.error.place_set_first" };
  }

  const set = formatSet(targetSetCards.concat(selectedCards));

  if (!tableService.isYourTurn(table, user)) {
    return { success: false, error: "rummy.error.wait_your_turn" };
  }
  if (!table.hasDrawn) {
    return { success: false, error: "rummy.error.draw_to_start" };
  }
  if (set.length < 3) {
    return { success: false, error: "rummy.error.need_3_cards" };
  }
  if (!isValidRummySet(set)) {
    return { success: false, error: "rummy.error.need_valid_set" };
  }

  const player = otherPlayer ? otherPlayer : user;
  table.players[player].sets = table.players[player].sets.map((s) => {
    if (set.some((c) => s[0].id === c.id)) {
      return set;
    }
    return s;
  });

  const { newHand } = tableService.removeCardsFromHand(
    table,
    user,
    currentHand,
    decryptedMap,
    set,
  );

  if (otherPlayer) {
    return {
      success: true,
      newHand,
      toastMessage: "rummy.place_other_set",
      toastParams: {
        from: user,
        to: otherPlayer,
      },
    };
  }

  return { success: true, newHand };
}

function placeNewSet(
  table: Table,
  user: string,
  selectedCards: Card[],
  currentHand: Card[],
  decryptedMap: Map<number, string>,
): { success: boolean; error?: string; newHand?: Card[] } {
  const set = formatSet(selectedCards);

  if (!tableService.isYourTurn(table, user)) {
    return { success: false, error: "rummy.error.wait_your_turn" };
  }
  if (set.length < 3) {
    return { success: false, error: "rummy.error.need_3_cards" };
  }
  if (!isValidRummySet(set)) {
    return { success: false, error: "rummy.error.need_valid_set" };
  }

  table.players[user].sets.push(set);
  const { newHand } = tableService.removeCardsFromHand(
    table,
    user,
    currentHand,
    decryptedMap,
    set,
  );
  return { success: true, newHand };
}

function validateDiscard(
  table: Table,
  user: string,
  selectedCards: Card[],
): { valid: boolean; error?: string } {
  if (!table.hasDrawn) {
    return { valid: false };
  }
  if (!tableService.isYourTurn(table, user)) {
    return { valid: false, error: "rummy.error.wait_your_turn" };
  }
  if (selectedCards.length === 0) {
    return { valid: false, error: "rummy.error.select_discard" };
  }
  if (selectedCards.length !== 1) {
    return { valid: false, error: "rummy.error.only_discard_1" };
  }
  return { valid: true };
}

function isValidRummySet(set: Card[]): boolean {
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
