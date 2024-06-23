import { EncryptedCard } from "../models";
import { Card, Table, PlayerHand } from "../models/cards.model";

const sides = { top: "top", bottom: "bottom" };

export const cardsService = {
  createDeck,
  createDeckWithOffset,
  merge,
  shuffle,
  flip,
  split,
  moveCard,
  moveCards,
  moveCardsFromIndex,
  isValidRummySet,
  areTablesEqual,
  areArraysEqual
};

// for now needs to be called with default values
function createDeck(colors = 4, values = 13): Card[] {
  const deck: Card[] = [];

  for (let col = 1; col <= colors; col++) {
    for (let val = 1; val <= values; val++) {
      deck.push(new Card(col, val));
    }
  }
  return shuffle(deck);
}

function createDeckWithOffset(
  colors = 4,
  values = 13,
  startColorsAt = 1,
  startValuesAt = 1
): Card[] {
  const deck: Card[] = [];

  for (let col = startColorsAt; col < colors + startColorsAt; col++) {
    for (let val = startValuesAt; val < values + startValuesAt; val++) {
      deck.push(new Card(col, val));
    }
  }
  const firstShuffle = shuffle(deck);
  return shuffle(firstShuffle);
}

function merge(obj: Card[], objs: Card[][]): void {
  for (let o = 0; o < objs.length; o++) {
    for (let c = 0; c < objs[o].length; c++) {
      obj.push(objs[o][c]);
    }

    while (objs[o].length > 0) {
      objs[o].pop();
    }
  }
}

function shuffle<T>(obj: T[]): T[] {
  const shuffled = [];
  let n = obj.length,
    i;
  while (n) {
    i = Math.floor(Math.random() * obj.length);

    if (i in obj) {
      shuffled.push(obj[i]);
      delete obj[i];
      n--;
    }
  }
  return shuffled;
}

function flip(obj: Card[]): void {
  obj.reverse();
}

function split(obj: Card[], index: number): Card[] {
  return obj.splice(index, obj.length - index);
}

function moveCard<T>(
  src: T[],
  dest: T[],
  from: "top" | "bottom",
  to: "top" | "bottom"
): void {
  let cardToMove: T;
  if (from == sides.top) cardToMove = src.shift()!;
  else if (from == sides.bottom) cardToMove = src.pop()!;
  if (to == sides.top) dest.unshift(cardToMove!);
  else if (to == sides.bottom) dest.push(cardToMove!);
}

function moveCards<T>(
  src: T[],
  dest: T[],
  from: "top" | "bottom",
  to: "top" | "bottom",
  count: number
): void {
  for (let i = 0; i < count; i++) {
    moveCard<T>(src, dest, from, to);
  }
}

function moveCardsFromIndex(
  src: Card[],
  dest: Card[],
  to: "top" | "bottom",
  count: number,
  index: number
): void {
  const cardsToMove = src.splice(index, count);
  if (to == sides.top) cardsToMove.reverse();

  for (let i = 0; i < cardsToMove.length; i++) {
    if (to == sides.top) dest.unshift(cardsToMove[i]);
    else if (to == sides.bottom) dest.push(cardsToMove[i]);
  }
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


function areTablesEqual(table1: Table, table2: Table) {
  return (
    table1.hasDrawn === table2.hasDrawn &&
    table1.whoseTurn === table2.whoseTurn &&
    table1.turn === table2.turn &&
    areEncryptedCarsEqual(table1.deck, table2.deck) &&
    areCardsEqual(table1.pile, table2.pile) &&
    table1.playerOrder.every((player) =>
      areHandsEqual(table1.players[player], table2.players[player])
    )
  );
}

function areArraysEqual(array1: any[], array2: any[]) {
  return (
    array1.length === array2.length &&
    array1.every((value, index) => value === array2[index])
  );
}

function areCardsEqual(cards1: Card[], cards2: Card[]) {
  return (
    cards1.length === cards2.length &&
    cards1.every((card, index) => card.id == cards2[index].id)
  );
}

function areEncryptedCarsEqual(cards1: EncryptedCard[], cards2: EncryptedCard[]) {
  return (
    cards1.length === cards2.length &&
    cards1.every((card, index) => card.card == cards2[index].card)
  );
}

function areSetsEqual(sets1: Card[][], sets2: Card[][]) {
  return (
    sets1.length === sets2.length &&
    sets1.every((set, index) => areCardsEqual(set, sets2[index]))
  );
}

function areHandsEqual(hand1: PlayerHand, hand2: PlayerHand) {
  return (
    hand1.connected === hand2.connected &&
    areEncryptedCarsEqual(hand1.encryptedCards, hand2.encryptedCards) &&
    areCardsEqual(hand1.cards, hand2.cards) &&
    areSetsEqual(hand1.sets, hand2.sets)
  );
}