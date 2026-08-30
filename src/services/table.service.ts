import { EncryptedCard } from "../models";
import { Card, Table, PlayerHand } from "../models/cards.model";
import { cardsService } from "./cards.service";
import { storeService } from "./store.service";

export const tableService = {
  createInitialTable,
  isYourTurn,
  playerHasCards,
  getNextPlayerTurn,
  drawFromDeck,
  discardToPile,
  addEncryptedCardsToHand,
  addCardsToHand,
  removeCardsFromHand,
};

function createInitialTable(user: string): Table {
  return {
    players: {
      [user]: new PlayerHand(),
    },
    whoseTurn: "",
    playerOrder: [],
    deck: [],
    pile: [],
    hasDrawn: false,
    turn: 0,
  };
}

function isYourTurn(table: Table, user: string): boolean {
  return table.whoseTurn === user;
}

function playerHasCards(table: Table, player: string): boolean {
  if (!table.players[player]) return false;
  return Boolean(
    table.players[player].cards.length +
      table.players[player].encryptedCards.length,
  );
}

function getNextPlayerTurn(table: Table): Table {
  let next = table.playerOrder.indexOf(table.whoseTurn);
  if (next === table.playerOrder.length - 1) {
    next = 0;
  } else {
    next++;
  }
  return {
    ...table,
    whoseTurn: table.playerOrder[next],
    hasDrawn: false,
    turn: table.turn + 1,
  };
}

function drawFromDeck(table: Table): EncryptedCard[] {
  table.hasDrawn = true;
  const cardsToDecrypt: EncryptedCard[] = [];
  cardsService.moveCard(table.deck, cardsToDecrypt, "top", "bottom");
  return cardsToDecrypt;
}

function discardToPile(
  table: Table,
  user: string,
  card: Card,
  currentHand: Card[],
  decryptedMap: Map<number, string>,
): { newTable: Table; newHand: Card[] } {
  card.selected = false;
  const { newHand } = removeCardsFromHand(
    table,
    user,
    currentHand,
    decryptedMap,
    [card],
  );
  table.pile.push(card);
  const newTable = getNextPlayerTurn(table);
  return { newTable, newHand };
}

function addEncryptedCardsToHand(
  table: Table,
  user: string,
  currentHand: Card[],
  decryptedMap: Map<number, string>,
  encryptedCards: EncryptedCard[],
  cards: Card[],
): { newHand: Card[] } {
  const newHand = [...currentHand];
  encryptedCards.forEach((encryptedCard, i) => {
    const card = cards[i];
    decryptedMap.set(encryptedCard.id, card.id);
    table.players[user].encryptedCards.push(encryptedCard);
    newHand.push(card);
  });
  storeService.setDecryptedMap(decryptedMap);
  storeService.setHand(newHand);
  return { newHand };
}

function addCardsToHand(
  table: Table,
  user: string,
  currentHand: Card[],
  cards: Card[],
): { newHand: Card[] } {
  table.players[user].cards = table.players[user].cards.concat(cards);
  const newHand = currentHand.concat(cards);
  storeService.setHand(newHand);
  return { newHand };
}

function removeCardsFromHand(
  table: Table,
  user: string,
  currentHand: Card[],
  decryptedMap: Map<number, string>,
  cardsToRemove: Card[],
): { newHand: Card[] } {
  table.players[user].encryptedCards = table.players[
    user
  ].encryptedCards.filter(
    (e) => !cardsToRemove.some((c) => c.id == decryptedMap.get(e.id)),
  );
  table.players[user].cards = table.players[user].cards.filter(
    (card) => !cardsToRemove.some((c) => c.id == card.id),
  );
  const newHand = currentHand.filter(
    (card) => !cardsToRemove.some((c) => c.id == card.id),
  );
  storeService.setHand(newHand);
  return { newHand };
}
