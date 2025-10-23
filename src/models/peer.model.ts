import { Table } from "./cards.model";
import { EncryptedCard } from "./encrypted-card.model";

export enum PeerDataType {
  table,
  deckEncryption,
  keyRequest,
  encryptionKeys,
  endOfGame,
}

export interface DeckEncryption {
  to: string;
  playerOrder: string[];
  cards: EncryptedCard[];
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

export interface PeerData {
  dataType: PeerDataType;
  table?: Table;
  deckEncryption?: DeckEncryption;
  keyRequest?: KeyRequest;
  encryptionKeys?: EncryptionKeys;
  endOfGame?: EndOfGame;
}
