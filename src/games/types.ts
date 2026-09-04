import { EncryptedCard } from "../models";
import { CheatEnum, GameId, Table } from "../models";

export type SelectionPolicy = "set" | "single";

export interface GameDefinition {
  id: GameId;
  titleKey: string;
  route: string;
  peerNamespace: string;
  minPlayers: number;
  maxPlayers: number;
  publicQueueSize: number;
  dealCount: (playerCount: number) => number;
  selectionPolicy: SelectionPolicy;
  isGameOver: (table: Table) => string | null;
  dealInitialCards: (table: Table, user: string) => EncryptedCard[] | null;
  cheatDetection: (table: Table, lastTable: Table) => CheatEnum | null;
  getNextRematchPlayerOrder: (order: string[]) => string[];
  auditCardCount: number;
  skipSetAudit: boolean;
}
