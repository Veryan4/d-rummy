import { Card, GameId, Table } from "./cards.model";
import { EncryptedCard } from "./encrypted-card.model";

export type DeckPurpose = "initial" | "recycle";

export enum PeerDataType {
  table,
  deckEncryption,
  keyRequest,
  encryptionKeys,
  endOfGame,
  rematch,
  deckSeed,
}

export interface DeckEncryption {
  to: string;
  playerOrder: string[];
  cards: EncryptedCard[];
  gameId?: GameId;
  purpose?: DeckPurpose;
  retainedPile?: Card[];
}

export interface KeyRequest {
  from: string;
  to: string;
  ids: number[];
}

export interface EncryptionKeys {
  from: string;
  to: string;
  keys: Record<number, JsonWebKey>;
}

export interface EndOfGame {
  from: string;
  secretMaps: Record<number, JsonWebKey>[];
}

export interface RematchRequest {
  playerOrder: string[];
}

export interface DeckSeed {
  to: string;
  playerOrder: string[];
  cards: Card[];
  gameId?: GameId;
  purpose?: DeckPurpose;
  retainedPile?: Card[];
}

export interface PeerData {
  dataType: PeerDataType;
  table?: Table;
  deckEncryption?: DeckEncryption;
  keyRequest?: KeyRequest;
  encryptionKeys?: EncryptionKeys;
  endOfGame?: EndOfGame;
  rematch?: RematchRequest;
  deckSeed?: DeckSeed;
}
