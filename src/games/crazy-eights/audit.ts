import { CheatEnum, DecryptedTable, Table } from "../../models";
import { cardsService } from "../../services/cards.service";
import { crazyEightsService } from "./rules";

function handCount(table: Table, player: string): number {
  const hand = table.players[player];
  if (!hand) {
    return 0;
  }
  return hand.cards.length + hand.encryptedCards.length;
}

function sortedCardIds(cards: { id: string }[]): string[] {
  return cards.map((card) => card.id).slice().sort();
}

function pilesEqual(a: Table, b: Table): boolean {
  if (a.pile.length !== b.pile.length) {
    return false;
  }
  return a.pile.every((card, i) => {
    const other = b.pile[i];
    if (card.id && other.id) {
      return card.id === other.id;
    }
    return card.color === other.color && card.value === other.value;
  });
}

function decksEqual(a: Table, b: Table): boolean {
  return cardsService.areSetOfEncryptedCardsEqual(a.deck, b.deck);
}

function crazyEightsEqual(a: Table, b: Table): boolean {
  const left = a.crazyEights;
  const right = b.crazyEights;
  if (!left || !right) {
    return false;
  }
  return (
    left.currentSuit === right.currentSuit &&
    left.direction === right.direction &&
    left.pendingDraw === right.pendingDraw
  );
}

function otherHandsUnchanged(
  table: Table,
  lastTable: Table,
  actor: string,
  ignore: ReadonlySet<string> = new Set(),
): boolean {
  return lastTable.playerOrder.every((player) => {
    if (player === actor || ignore.has(player)) {
      return true;
    }
    const previous = lastTable.players[player];
    const next = table.players[player];
    if (!previous || !next) {
      return false;
    }
    return (
      cardsService.areSetOfEncryptedCardsEqual(
        previous.encryptedCards,
        next.encryptedCards,
      ) &&
      sortedCardIds(previous.cards).join() === sortedCardIds(next.cards).join()
    );
  });
}

function allHandsUnchanged(table: Table, lastTable: Table): boolean {
  return lastTable.playerOrder.every((player) => {
    const previous = lastTable.players[player];
    const next = table.players[player];
    if (!previous || !next) {
      return false;
    }
    return (
      handCount(table, player) === handCount(lastTable, player) &&
      cardsService.areSetOfEncryptedCardsEqual(
        previous.encryptedCards,
        next.encryptedCards,
      ) &&
      sortedCardIds(previous.cards).join() === sortedCardIds(next.cards).join()
    );
  });
}

export function isForcedDrawContinuation(last: Table, next: Table): boolean {
  const lastState = last.crazyEights;
  const nextState = next.crazyEights;
  if (!lastState || !nextState) {
    return false;
  }
  if (!(lastState.pendingDraw > 0)) {
    return false;
  }
  if (next.whoseTurn !== last.whoseTurn) {
    return false;
  }
  if (next.turn !== last.turn && next.turn !== last.turn + 1) {
    return false;
  }
  if (!pilesEqual(next, last)) {
    return false;
  }
  if (
    lastState.currentSuit !== nextState.currentSuit ||
    lastState.direction !== nextState.direction ||
    nextState.pendingDraw > lastState.pendingDraw
  ) {
    return false;
  }
  const actor = last.whoseTurn;
  const deckDelta = last.deck.length - next.deck.length;
  const handDelta = handCount(next, actor) - handCount(last, actor);
  const pendingDelta = lastState.pendingDraw - nextState.pendingDraw;
  if (
    pendingDelta === 0 &&
    deckDelta === 0 &&
    handDelta === 0 &&
    last.hasDrawn === next.hasDrawn
  ) {
    return false;
  }
  return true;
}

export function collapseCrazyEightsForcedDraws(
  tables: DecryptedTable[],
): DecryptedTable[] {
  const collapsed: DecryptedTable[] = [];
  for (const table of tables) {
    const last = collapsed.at(-1);
    if (
      last &&
      isForcedDrawContinuation(
        tableFromDecrypted(last),
        tableFromDecrypted(table),
      )
    ) {
      collapsed[collapsed.length - 1] = table;
    } else {
      collapsed.push(table);
    }
  }
  return collapsed;
}

export function tableFromDecrypted(table: DecryptedTable): Table {
  const players: Table["players"] = {};
  table.playerOrder.forEach((player) => {
    const hand = table.players[player];
    players[player] = {
      cards: hand?.cards ?? [],
      encryptedCards: [],
      sets: hand?.sets ?? [],
      connected: true,
    };
  });
  return {
    gameId: table.gameId,
    turn: table.turn,
    whoseTurn: table.whoseTurn,
    playerOrder: [...table.playerOrder],
    hasDrawn: table.hasDrawn,
    pile: table.pile,
    crazyEights: table.crazyEights,
    deck: table.deck.map((card, i) => ({
      card: [card.color, card.value],
      id: i + 1,
      ivArr: [],
    })),
    players,
  };
}

function playedCardWasInHand(
  lastTable: Table,
  actor: string,
  played: { id: string },
): boolean {
  const cards = lastTable.players[actor]?.cards ?? [];
  if (!cards.length) {
    return true;
  }
  return cards.some((card) => card.id === played.id);
}

export function crazyEightsCheatDetection(
  table: Table,
  lastTable: Table,
): CheatEnum | null {
  if (!lastTable) {
    return CheatEnum.unableToCheatDetect;
  }

  const turnDelta = table.turn - lastTable.turn;
  if (turnDelta !== 0 && turnDelta !== 1) {
    return CheatEnum.outOfOrderTurns;
  }

  if (!lastTable.playerOrder.every((p, i) => table.playerOrder[i] == p)) {
    return CheatEnum.playerTurnOrderChanged;
  }

  const actor = lastTable.whoseTurn;
  if (!actor || !lastTable.players[actor] || !table.players[actor]) {
    return CheatEnum.unableToCheatDetect;
  }

  const played =
    table.pile.length === lastTable.pile.length + 1
      ? table.pile.at(-1)
      : undefined;
  const ignoreHands = new Set<string>();
  if (
    played &&
    crazyEightsService.isTwo(played) &&
    table.whoseTurn &&
    table.whoseTurn !== actor
  ) {
    ignoreHands.add(table.whoseTurn);
  }
  if (!otherHandsUnchanged(table, lastTable, actor, ignoreHands)) {
    return CheatEnum.otherPlayersHandsChanged;
  }

  const lastState = lastTable.crazyEights;
  const nextState = table.crazyEights;
  if (!lastState || !nextState) {
    return CheatEnum.invalidCrazyEightsState;
  }

  const penalty = detectPenaltyDraw(table, lastTable, actor);
  if (penalty !== undefined) {
    return penalty;
  }

  if (turnDelta === 0) {
    const win = detectWinningPlay(table, lastTable, actor, lastTable);
    if (win !== undefined) {
      return win;
    }
    return detectSameTurn(table, lastTable, actor);
  }

  const baseline = structuredClone(lastTable);
  crazyEightsService.ensureState(baseline);
  const drewPenalty = baseline.crazyEights!.pendingDraw > 0;
  if (drewPenalty) {
    crazyEightsService.finishPenalty(baseline, actor);
  }

  const pileGrew = table.pile.length === lastTable.pile.length + 1;
  const victim =
    played &&
    crazyEightsService.isTwo(played) &&
    table.whoseTurn &&
    table.whoseTurn !== actor
      ? table.whoseTurn
      : null;
  const victimDraw = victim
    ? handCount(table, victim) - handCount(lastTable, victim)
    : 0;
  const actorDeckDelta =
    lastTable.deck.length - table.deck.length - victimDraw;
  const expectedHandAfterPlay =
    handCount(lastTable, actor) - 1 + actorDeckDelta;

  if (pileGrew) {
    const win = detectWinningPlay(table, lastTable, actor, baseline);
    if (win !== undefined) {
      return win;
    }
    if (!played || !crazyEightsService.isLegalPlay(baseline, played)) {
      return CheatEnum.illegalCardPlayed;
    }
    const drewThenPlayed =
      !drewPenalty && victimDraw === 0 && actorDeckDelta > 0;
    if (
      !playedCardWasInHand(lastTable, actor, played) &&
      !drewThenPlayed
    ) {
      return CheatEnum.illegalCardPlayed;
    }
    if (
      !drewPenalty &&
      !drewThenPlayed &&
      lastTable.deck.length - table.deck.length !== victimDraw
    ) {
      return CheatEnum.invalidCrazyEightsState;
    }
    if (handCount(table, actor) !== expectedHandAfterPlay) {
      return CheatEnum.invalidCrazyEightsState;
    }
    const { skip } = crazyEightsService.applySpecials(
      baseline,
      played,
      nextState.currentSuit,
    );
    const expectedNext = crazyEightsService.nextPlayerAfter(
      baseline,
      actor,
      skip,
    );
    if (table.whoseTurn !== expectedNext) {
      return CheatEnum.wrongNextPlayer;
    }
    if (
      baseline.crazyEights!.direction !== nextState.direction ||
      baseline.crazyEights!.currentSuit !== nextState.currentSuit
    ) {
      return CheatEnum.invalidCrazyEightsState;
    }
    if (victim) {
      const expectedPending = baseline.crazyEights!.pendingDraw;
      if (nextState.pendingDraw === expectedPending) {
        if (victimDraw !== 0) {
          return CheatEnum.invalidCrazyEightsState;
        }
      } else if (nextState.pendingDraw === 0) {
        if (victimDraw !== lastTable.deck.length - table.deck.length) {
          return CheatEnum.invalidCrazyEightsState;
        }
        if (victimDraw > expectedPending) {
          return CheatEnum.invalidCrazyEightsState;
        }
        if (victimDraw === 0 && lastTable.deck.length !== 0) {
          return CheatEnum.invalidCrazyEightsState;
        }
      } else {
        return CheatEnum.invalidCrazyEightsState;
      }
    } else if (baseline.crazyEights!.pendingDraw !== nextState.pendingDraw) {
      return CheatEnum.invalidCrazyEightsState;
    }
    return null;
  }

  if (!pilesEqual(table, lastTable) || !decksEqual(table, lastTable)) {
    return CheatEnum.invalidCrazyEightsState;
  }
  if (handCount(table, actor) !== handCount(lastTable, actor)) {
    return CheatEnum.invalidCrazyEightsState;
  }
  if (!crazyEightsEqual(table, lastTable)) {
    return CheatEnum.invalidCrazyEightsState;
  }

  const expectedNext = crazyEightsService.nextPlayerAfter(baseline, actor, 0);
  if (table.whoseTurn !== expectedNext) {
    return CheatEnum.wrongNextPlayer;
  }

  return null;
}

function detectWinningPlay(
  table: Table,
  lastTable: Table,
  actor: string,
  baseline: Table,
): CheatEnum | null | undefined {
  if (table.pile.length !== lastTable.pile.length + 1) {
    return undefined;
  }
  if (handCount(table, actor) !== 0) {
    return undefined;
  }
  const played = table.pile.at(-1);
  if (!played || !crazyEightsService.isLegalPlay(baseline, played)) {
    return CheatEnum.illegalCardPlayed;
  }
  if (!playedCardWasInHand(lastTable, actor, played)) {
    return CheatEnum.illegalCardPlayed;
  }
  const drewPenalty = (lastTable.crazyEights?.pendingDraw ?? 0) > 0;
  if (!drewPenalty && lastTable.deck.length !== table.deck.length) {
    return CheatEnum.invalidCrazyEightsState;
  }
  return null;
}

function detectPenaltyDraw(
  table: Table,
  lastTable: Table,
  actor: string,
): CheatEnum | null | undefined {
  const lastState = lastTable.crazyEights;
  const nextState = table.crazyEights;
  if (!lastState || !nextState) {
    return undefined;
  }
  if (table.whoseTurn !== actor || lastTable.whoseTurn !== table.whoseTurn) {
    return undefined;
  }
  if (!pilesEqual(table, lastTable)) {
    return undefined;
  }
  if (
    lastState.currentSuit !== nextState.currentSuit ||
    lastState.direction !== nextState.direction
  ) {
    return undefined;
  }

  const pendingDelta = lastState.pendingDraw - nextState.pendingDraw;
  const deckDelta = lastTable.deck.length - table.deck.length;
  const handDelta = handCount(table, actor) - handCount(lastTable, actor);

  if (pendingDelta < 0) {
    return undefined;
  }

  if (pendingDelta === 0) {
    if (lastState.pendingDraw <= 0) {
      return undefined;
    }
    if (deckDelta === 0 && handDelta === 0) {
      return null;
    }
    if (deckDelta > 0 && handDelta === 0 && deckDelta <= lastState.pendingDraw) {
      return null;
    }
    return CheatEnum.invalidCrazyEightsState;
  }

  if (handDelta === pendingDelta && deckDelta === pendingDelta) {
    return null;
  }
  if (handDelta === pendingDelta && deckDelta === 0) {
    return null;
  }
  if (handDelta === 0 && deckDelta === pendingDelta) {
    return null;
  }
  if (
    nextState.pendingDraw === 0 &&
    handDelta === 0 &&
    deckDelta === 0 &&
    lastTable.deck.length === 0
  ) {
    return null;
  }
  return CheatEnum.invalidCrazyEightsState;
}

function detectSameTurn(
  table: Table,
  lastTable: Table,
  actor: string,
): CheatEnum | null {
  if (table.whoseTurn !== actor) {
    return CheatEnum.wrongNextPlayer;
  }

  const lastState = lastTable.crazyEights!;
  const nextState = table.crazyEights!;

  if (
    lastTable.deck.length === 0 &&
    table.deck.length > 0 &&
    table.pile.length === 1 &&
    lastTable.pile.length > 1 &&
    table.pile[0]?.id === lastTable.pile.at(-1)?.id &&
    allHandsUnchanged(table, lastTable)
  ) {
    return null;
  }

  const deckDelta = lastTable.deck.length - table.deck.length;
  const handDelta = handCount(table, actor) - handCount(lastTable, actor);
  if (
    lastState.pendingDraw === 0 &&
    nextState.pendingDraw === 0 &&
    table.hasDrawn &&
    deckDelta > 0 &&
    handDelta === deckDelta &&
    pilesEqual(table, lastTable) &&
    lastState.currentSuit === nextState.currentSuit &&
    lastState.direction === nextState.direction
  ) {
    return null;
  }

  return CheatEnum.outOfOrderTurns;
}
