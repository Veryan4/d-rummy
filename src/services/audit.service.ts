import {
  Audit,
  AuditEnum,
  Card,
  CheatEnum,
  DecryptedTable,
  EncryptedCard,
  Table,
} from "../models";
import { cardsService } from "./cards.service";
import { encryptService } from "./encrypt.service";

const decryptedMaps = [new Map<number, Card>()];

export const auditService = {
  cheatDetection,
  audit,
};

function cheatDetection(table: Table, lastTable: Table): CheatEnum | null {
  const playerIndex = table.playerOrder.indexOf(table.whoseTurn);
  const previousPlayer = table.playerOrder.at(playerIndex - 1);

  if (!lastTable || playerIndex < 0) {
    return CheatEnum.unableToCheatDetect;
  }

  if (lastTable.turn != table.turn - 1) {
    return CheatEnum.outOfOrderTurns;
  }

  if (!lastTable.playerOrder.every((p, i) => table.playerOrder[i] == p)) {
    return CheatEnum.playerTurnOrderChanged;
  }

  if (lastTable.whoseTurn != previousPlayer) {
    return CheatEnum.wrongPlayersTurn;
  }

  if (
    lastTable.deck.length != table.deck.length + 1 &&
    lastTable.pile.length == table.pile.length &&
    table.pile.length != 1
  ) {
    return CheatEnum.cardsTakenFromPileAndDeck;
  }

  if (
    lastTable.playerOrder.some(
      (player) =>
        player != previousPlayer &&
        !cardsService.areSetOfEncryptedCardsEqual(
          lastTable.players[player].encryptedCards,
          table.players[player].encryptedCards
        )
    )
  ) {
    return CheatEnum.otherPlayersHandsChanged;
  }

  if (
    lastTable.playerOrder.some(
      (player) =>
        player != previousPlayer &&
        !table.players[player].sets.every((set) =>
          cardsService.isValidRummySet(set)
        )
    )
  ) {
    return CheatEnum.setsNotValid;
  }

  if (
    table.players[previousPlayer].sets.some(
      (set) => !cardsService.isValidRummySet(set)
    )
  ) {
    return CheatEnum.setsNotValid;
  }

  return null;
}

async function audit(
  tablesOverTime: Table[],
  playersSecrets: Map<string, Map<number, JsonWebKey>[]>
) {
  const decryptedTablesOverTime = await decryptTablesOverTime(
    tablesOverTime,
    playersSecrets
  );
  const firstTable = decryptedTablesOverTime[0];
  const players = firstTable.playerOrder;

  const audit = decryptedTablesOverTime.reduce((acc, table) => {
    const infractions: AuditEnum[] = [];
    const cardCount =
      table.deck.length +
      table.pile.length +
      players.reduce((a, c) => {
        const setCounts = table.players[c].sets.reduce(
          (sa, s) => sa + s.length,
          0
        );
        return a + table.players[c].cards.length + setCounts;
      }, 0);
    if (cardCount != 52) {
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
            [] as string[]
          );
          return a
            .concat(table.players[c].cards.map((c) => c.id))
            .concat(setCards);
        }, [] as string[])
      )
      .sort();

    if (
      cardCount == 52 &&
      !cardsInPlay.every((id, i) => id == idCheckList[i])
    ) {
      infractions.push(AuditEnum.notAllCardsAreUnique);
    }

    if (
      players.some((player) => {
        table.players[player].sets.some(
          (set) => !cardsService.isValidRummySet(set)
        );
      })
    ) {
      infractions.push(AuditEnum.wrongAmountOfTotalCards);
    }
    acc.push({ infractions, turn: table.turn });
    return acc;
  }, [] as Audit[]);

  return { audit, decryptedTablesOverTime };
}

async function decryptTablesOverTime(
  tablesOverTime: Table[],
  playersSecrets: Map<string, Map<number, JsonWebKey>[]>
) {
  const decryptOrder = tablesOverTime[0].playerOrder.reverse();
  const pileFlips = tablesOverTime.reduce(
    (acc, t, i) => {
      if (
        i > 0 &&
        tablesOverTime[i - 1].deck.length == 0 &&
        t.deck.length != 0
      ) {
        acc.push(i);
      }
      return acc;
    },
    [0]
  );
  decryptedMaps.length = 0;
  let flipCount = 0;
  for (const pileFlip of pileFlips) {
    decryptedMaps.push(new Map<number, Card>());
    const firstTable = tablesOverTime[pileFlip];
    let cards = [...firstTable.deck];
    firstTable.playerOrder.map(
      (player) =>
        (cards = cards.concat(firstTable.players[player].encryptedCards))
    );
    await decryptAllCards(cards, playersSecrets, decryptOrder, flipCount);
    flipCount++;
  }
  let decryptedMapCount = 0;
  return tablesOverTime.map((table, i) => {
    if (i > 0 && pileFlips.includes(i)) {
      decryptedMapCount++;
    }
    const decryptedMap = decryptedMaps[decryptedMapCount];
    const decryptedTable: DecryptedTable = {
      ...table,
      players: {
        ...table.players,
      },
      deck: table.deck.map((layer) => decryptedMap.get(layer.id)!),
    };
    table.playerOrder.map((player) => {
      decryptedTable.players[player] = {
        cards: table.players[player].cards.concat(
          table.players[player].encryptedCards?.map(
            (layer) => decryptedMap.get(layer.id)!
          ) ?? []
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
  index: number
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
