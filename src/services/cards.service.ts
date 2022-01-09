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
  createRummyTable,
};

// for now needs to be called with default values
function createDeck(colors = 4, values = 13): Card[] {
  const deck: Card[] = [];

  for (let col = 1; col <= colors; col++) {
    for (let val = 1; val <= values; val++) {
      deck.push(new Card(col, val));
    }
  }
  const firstShuffle = shuffle(deck);
  return shuffle(firstShuffle);
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

function shuffle(obj: Card[]): Card[] {
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

function moveCard(
  src: Card[],
  dest: Card[],
  from: "top" | "bottom",
  to: "top" | "bottom"
): void {
  let cardToMove: Card;
  if (from == sides.top) cardToMove = src.shift()!;
  else if (from == sides.bottom) cardToMove = src.pop()!;
  if (to == sides.top) dest.unshift(cardToMove!);
  else if (to == sides.bottom) dest.push(cardToMove!);
}

function moveCards(
  src: Card[],
  dest: Card[],
  from: "top" | "bottom",
  to: "top" | "bottom",
  count: number
): void {
  for (let i = 0; i < count; i++) {
    moveCard(src, dest, from, to);
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

function createRummyTable(players: string[]): Table {
  const table: Table = {
    players: {},
    playerOrder: [],
    deck: createDeck(),
    pile: [],
    hasDrawn: false,
  };
  players.forEach((player) => {
    table.players[player] = new PlayerHand();
    moveCards(table.deck, table.players[player].hand, "top", "top", 7);
    table.playerOrder.push(player);
  });
  return table;
}
