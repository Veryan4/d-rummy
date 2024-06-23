import { EncryptedCard } from "./encrypted-card.model";

export type SymbolType = "♠" | "♥" | "♣" | "♦";
export type RankType =
  | "a"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "j"
  | "q"
  | "k";

const symbols: SymbolType[] = ["♠", "♥", "♣", "♦"];
const ranks: RankType[] = [
  "a",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "j",
  "q",
  "k",
];

export class Card {
  id: string;
  symbol: SymbolType;
  rank: RankType;
  color: number;
  value: number;
  selected = false;
  isdragging = false;

  constructor(color: number, value: number) {
    this.symbol = symbols[color - 1];
    this.rank = ranks[value - 1];
    this.color = color;
    this.value = value;
    this.id = color + "-" + value;
  }

  equal(card: Card): boolean {
    return this.symbol == card.symbol && this.rank == card.rank;
  }
}

export class PlayerHand {
  encryptedCards: EncryptedCard[] = [];
  cards: Card[] = [];
  sets: Card[][] = [];
  connected = true;
}

export class Table {
  players: { [username: string]: PlayerHand } = {};
  playerOrder: string[] = [];
  whoseTurn: string;
  deck: EncryptedCard[];
  pile: Card[];
  hasDrawn = false;
  turn = 0;
}
