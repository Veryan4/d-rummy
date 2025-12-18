import { Card, DecryptedTable, EncryptedCard, Table } from "../models";
import { encryptService } from "./encrypt.service";

const decryptedMap = new Map<number, Card>();

export const auditService = {
  decryptTablesOverTime,
  decryptAllCards,
};

async function decryptTablesOverTime(
  tablesOverTime: Table[],
  playersSecrets: Map<string, Map<number, JsonWebKey>>
) {
  decryptedMap.clear();
  const firstTable = tablesOverTime[0];
  const decryptOrder = firstTable.playerOrder.reverse();
  await decryptAllCards(firstTable.deck, playersSecrets, decryptOrder);
  firstTable.playerOrder.map(async (player) => {
    await decryptAllCards(
      firstTable.players[player].encryptedCards,
      playersSecrets,
      decryptOrder
    );
  });
  return tablesOverTime.map((table) => {
    const decryptedTable: DecryptedTable = {
      ...table,
      deck: table.deck.map((layer) => decryptedMap.get(layer.id)!),
    };
    table.playerOrder.forEach((player) => {
      decryptedTable.players[player] = {
        cards: table.players[player].encryptedCards
          .map((layer) => decryptedMap.get(layer.id)!)
          .concat(table.players[player].cards),
        sets: table.players[player].sets,
      };
    });
    return decryptedTable;
  });
}

async function decryptAllCards(
  encryptedCards: EncryptedCard[],
  playersSecrets: Map<string, Map<number, JsonWebKey>>,
  decryptOrder: string[]
) {
  let layers: EncryptedCard[] = [];
  let decryptedCards: Card[] = [];
  let ids: number[] = [];
  await decryptOrder.map(async (player) => {
    const secrets = encryptedCards.map(
      (layer) => playersSecrets.get(player)?.get(layer.id)!
    );
    if (decryptOrder.at(0) == player) {
      ids = encryptedCards.map((layer) => layer.id);
      layers = await encryptService.decryptLayers(encryptedCards, secrets);
      return;
    }
    if (decryptOrder.at(-1) == player) {
      decryptedCards = await encryptService.decryptCards(layers, secrets);
      return;
    }
    layers = await encryptService.decryptLayers(layers, secrets);
  });
  ids.map((id, i) => {
    decryptedMap.set(id, decryptedCards[i]);
  });
  return decryptedCards;
}
