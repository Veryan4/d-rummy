import { GameId } from "../models";
import { crazyEightsDefinition } from "./crazy-eights/definition";
import { rummyDefinition } from "./rummy/definition";
import { GameDefinition } from "./types";

const games: Record<GameId, GameDefinition> = {
  rummy: rummyDefinition,
  "crazy-eights": crazyEightsDefinition,
};

export function listGames(): GameDefinition[] {
  return [crazyEightsDefinition, rummyDefinition];
}

export function isGameId(id: string | null | undefined): id is GameId {
  return id === "rummy" || id === "crazy-eights";
}

export function getGame(id?: string | null): GameDefinition {
  if (id && isGameId(id)) {
    return games[id];
  }
  // Legacy tables omit gameId; those games are rummy. Not a product default.
  return rummyDefinition;
}

export { rummyDefinition, crazyEightsDefinition };
export type { GameDefinition } from "./types";
