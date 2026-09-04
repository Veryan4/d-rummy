import { rummyService } from "../../services/rummy.service";
import { GameDefinition } from "../types";
import { rummyCheatDetection } from "./audit";

export const rummyDefinition: GameDefinition = {
  id: "rummy",
  titleKey: "games.rummy",
  route: "rummy",
  peerNamespace: "rummy",
  minPlayers: 2,
  maxPlayers: 8,
  publicQueueSize: 2,
  dealCount: () => 7,
  selectionPolicy: "set",
  isGameOver: rummyService.isGameOver,
  dealInitialCards: rummyService.dealInitialCards,
  cheatDetection: rummyCheatDetection,
  getNextRematchPlayerOrder: rummyService.getNextRematchPlayerOrder,
  auditCardCount: 52,
  skipSetAudit: false,
};
