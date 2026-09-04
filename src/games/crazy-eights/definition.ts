import { GameDefinition } from "../types";
import { crazyEightsCheatDetection } from "./audit";
import { crazyEightsService } from "./rules";

export const crazyEightsDefinition: GameDefinition = {
  id: "crazy-eights",
  titleKey: "games.crazyEights",
  route: "crazy-eights",
  peerNamespace: "crazy-eights",
  minPlayers: 2,
  maxPlayers: 5,
  publicQueueSize: 2,
  dealCount: crazyEightsService.dealCount,
  selectionPolicy: "single",
  isGameOver: crazyEightsService.isGameOver,
  dealInitialCards: crazyEightsService.dealInitialCards,
  cheatDetection: crazyEightsCheatDetection,
  getNextRematchPlayerOrder: crazyEightsService.getNextRematchPlayerOrder,
  auditCardCount: 52,
  skipSetAudit: true,
};
