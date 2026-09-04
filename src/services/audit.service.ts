import {
  Audit,
  AuditEnum,
  Card,
  CheatEnum,
  DecryptedTable,
  EncryptedCard,
  Table,
} from "../models";
import { getGame } from "../games/registry";
import {
  collapseCrazyEightsForcedDraws,
  isForcedDrawContinuation,
  tableFromDecrypted,
} from "../games/crazy-eights/audit";
import { encryptService } from "./encrypt.service";
import { rummyService } from "./rummy.service";

const decryptedMaps = [new Map<number, Card>()];

export const auditService = {
  cheatDetection,
  audit,
  decryptOrderFor,
  applyCrazyEightsTurnAudit,
};

export function decryptOrderFor(playerOrder: string[]): string[] {
  return [...playerOrder].reverse();
}

function cheatDetection(table: Table, lastTable: Table): CheatEnum | null {
  return getGame(table.gameId).cheatDetection(table, lastTable);
}

export function applyCrazyEightsTurnAudit(
  audit: Audit[],
  decryptedTablesOverTime: DecryptedTable[],
): void {
  for (let i = 1; i < decryptedTablesOverTime.length; i++) {
    const previous = decryptedTablesOverTime[i - 1];
    const next = decryptedTablesOverTime[i];
    if (next.turn === 0) {
      continue;
    }
    if (
      isForcedDrawContinuation(
        tableFromDecrypted(previous),
        tableFromDecrypted(next),
      )
    ) {
      continue;
    }
    const cheat = cheatDetection(
      tableFromDecrypted(next),
      tableFromDecrypted(previous),
    );
    if (cheat != null) {
      audit[i]?.infractions.push(AuditEnum.illegalTurn);
    }
  }
}

async function audit(
  tablesOverTime: Table[],
  playersSecrets: Map<string, Map<number, JsonWebKey>[]>,
) {
  let decryptedTablesOverTime = await decryptTablesOverTime(
    tablesOverTime,
    playersSecrets,
  );
  const firstTable = decryptedTablesOverTime[0];
  const players = firstTable.playerOrder;

  const game = getGame(firstTable.gameId);
  if (game.id === "crazy-eights") {
    decryptedTablesOverTime = collapseCrazyEightsForcedDraws(
      decryptedTablesOverTime,
    );
  }
  const expectedCount = game.auditCardCount;

  const audit = decryptedTablesOverTime.reduce((acc, table) => {
    const infractions: AuditEnum[] = [];
    const cardCount =
      table.deck.length +
      table.pile.length +
      players.reduce((a, c) => {
        const setCounts = table.players[c].sets.reduce(
          (sa, s) => sa + s.length,
          0,
        );
        return a + table.players[c].cards.length + setCounts;
      }, 0);
    if (cardCount != expectedCount) {
      infractions.push(AuditEnum.wrongAmountOfTotalCards);
    }

    const idCheckList: (string | null)[] = structuredClone(allPossibleCardIDs);
    const cardsInPlay = table.deck
      .map((c) => c.id)
      .concat(table.pile.map((c) => c.id))
      .concat(
        players.reduce((a, c) => {
          const setCards = table.players[c].sets.reduce(
            (sa, s) => sa.concat(s.map((c) => c.id)),
            [] as string[],
          );
          return a
            .concat(table.players[c].cards.map((c) => c.id))
            .concat(setCards);
        }, [] as string[]),
      )
      .sort();

    if (
      cardCount == expectedCount &&
      !cardsInPlay.every((id, i) => id == idCheckList[i])
    ) {
      infractions.push(AuditEnum.notAllCardsAreUnique);
    }

    if (
      !game.skipSetAudit &&
      players.some((player) =>
        table.players[player].sets.some(
          (set) => !rummyService.isValidRummySet(set),
        ),
      )
    ) {
      infractions.push(AuditEnum.wrongAmountOfTotalCards);
    }
    acc.push({ infractions, turn: table.turn });
    return acc;
  }, [] as Audit[]);

  if (game.id === "crazy-eights") {
    applyCrazyEightsTurnAudit(audit, decryptedTablesOverTime);
  }

  return { audit, decryptedTablesOverTime };
}

function encryptedCardKey(card: EncryptedCard): string {
  return `${card.id}:${card.ivArr.join(",")}:${card.card.join(",")}`;
}

function isNewEncryptionGeneration(previous: Table, next: Table): boolean {
  if (next.deck.length === 0) {
    return false;
  }
  if (previous.deck.length === 0) {
    return true;
  }
  const previousKeys = new Set(previous.deck.map(encryptedCardKey));
  return next.deck.some((card) => !previousKeys.has(encryptedCardKey(card)));
}

function pileFlipIndexes(tablesOverTime: Table[]): number[] {
  const flips = [0];
  for (let i = 1; i < tablesOverTime.length; i++) {
    if (isNewEncryptionGeneration(tablesOverTime[i - 1], tablesOverTime[i])) {
      flips.push(i);
    }
  }
  return flips;
}

function collectUndecryptedCards(
  table: Table,
  decryptedByLayer: Map<string, Card>,
): EncryptedCard[] {
  const seen = new Set<string>();
  const cards: EncryptedCard[] = [];
  for (const card of [
    ...table.deck,
    ...table.playerOrder.flatMap(
      (player) => table.players[player]?.encryptedCards ?? [],
    ),
  ]) {
    const key = encryptedCardKey(card);
    if (seen.has(key) || decryptedByLayer.has(key)) {
      continue;
    }
    seen.add(key);
    cards.push(card);
  }
  return cards;
}

function lookupDecryptedCard(
  layer: EncryptedCard,
  decryptedByLayer: Map<string, Card>,
  decryptedMap: Map<number, Card>,
): Card {
  return (
    decryptedByLayer.get(encryptedCardKey(layer)) ?? decryptedMap.get(layer.id)!
  );
}

async function decryptTablesOverTime(
  tablesOverTime: Table[],
  playersSecrets: Map<string, Map<number, JsonWebKey>[]>,
) {
  const decryptOrder = decryptOrderFor(tablesOverTime[0].playerOrder);
  const pileFlips = pileFlipIndexes(tablesOverTime);
  decryptedMaps.length = 0;
  const decryptedByLayer = new Map<string, Card>();
  let flipCount = 0;
  for (const pileFlip of pileFlips) {
    decryptedMaps.push(new Map<number, Card>());
    const cards = collectUndecryptedCards(
      tablesOverTime[pileFlip],
      decryptedByLayer,
    );
    if (cards.length) {
      await decryptAllCards(
        cards,
        playersSecrets,
        decryptOrder,
        flipCount,
        decryptedByLayer,
      );
    }
    flipCount++;
  }
  let decryptedMapCount = 0;
  return tablesOverTime.map((table, i) => {
    if (i > 0 && pileFlips.includes(i)) {
      decryptedMapCount++;
    }
    const decryptedMap = decryptedMaps[decryptedMapCount];
    const lookup = (layer: EncryptedCard) =>
      lookupDecryptedCard(layer, decryptedByLayer, decryptedMap);
    const decryptedTable: DecryptedTable = {
      ...table,
      players: {
        ...table.players,
      },
      deck: table.deck.map(lookup),
    };
    table.playerOrder.map((player) => {
      decryptedTable.players[player] = {
        cards: table.players[player].cards.concat(
          table.players[player].encryptedCards?.map(lookup) ?? [],
        ),
        sets: table.players[player].sets,
      };
    });
    return decryptedTable;
  });
}

async function decryptAllCards(
  encryptedCards: EncryptedCard[],
  playersSecrets: Map<string, Map<number, JsonWebKey>[]>,
  decryptOrder: string[],
  index: number,
  decryptedByLayer: Map<string, Card>,
) {
  let layers: EncryptedCard[] = [];
  let decryptedCards: Card[] = [];
  let ids: number[] = [];
  for (let i = 0; i < decryptOrder.length; i++) {
    const player = decryptOrder[i];
    const secrets = playersSecrets.get(player)![index];
    if (decryptOrder.at(0) == player) {
      ids = encryptedCards.map((layer) => layer.id);
      layers = await encryptService.decryptLayers(encryptedCards, secrets);
      continue;
    }
    if (decryptOrder.at(-1) == player) {
      decryptedCards = await encryptService.decryptCards(layers, secrets);
      continue;
    }
    layers = await encryptService.decryptLayers(layers, secrets);
  }
  ids.map((id, i) => {
    decryptedMaps[index].set(id, decryptedCards[i]);
    decryptedByLayer.set(encryptedCardKey(encryptedCards[i]), decryptedCards[i]);
  });
  return decryptedCards;
}

const allPossibleCardIDs = [
  "1-1",
  "1-2",
  "1-3",
  "1-4",
  "1-5",
  "1-6",
  "1-7",
  "1-8",
  "1-9",
  "1-10",
  "1-11",
  "1-12",
  "1-13",
  "2-1",
  "2-2",
  "2-3",
  "2-4",
  "2-5",
  "2-6",
  "2-7",
  "2-8",
  "2-9",
  "2-10",
  "2-11",
  "2-12",
  "2-13",
  "3-1",
  "3-2",
  "3-3",
  "3-4",
  "3-5",
  "3-6",
  "3-7",
  "3-8",
  "3-9",
  "3-10",
  "3-11",
  "3-12",
  "3-13",
  "4-1",
  "4-2",
  "4-3",
  "4-4",
  "4-5",
  "4-6",
  "4-7",
  "4-8",
  "4-9",
  "4-10",
  "4-11",
  "4-12",
  "4-13",
].sort();
