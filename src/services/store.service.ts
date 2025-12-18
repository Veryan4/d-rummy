import { Card, DecryptedTable, Table } from "../models";

export const storeService = {
  getGameState,
  eraseGameState,
  setPlayers,
  setHand,
  setTable,
  setDecryptedMap,
  setTableOverTime,
  setGame,
  setDecryptedTableOverTime,
  getDecryptedTableOverTime,
};

function getGameState() {
  let game,
    players,
    table,
    hand,
    decryptedMap,
    tableOverTime,
    decryptedTablesOverTime;
  game = sessionStorage.getItem("game");
  players = sessionStorage.getItem("players");
  if (players) {
    players = JSON.parse(players);
    table = sessionStorage.getItem("table");
    if (table) {
      table = JSON.parse(table);
      hand = sessionStorage.getItem("hand");
      hand = hand ? JSON.parse(hand) : [];
      decryptedMap = sessionStorage.getItem("decryptedMap");
      decryptedMap = decryptedMap ? JSON.parse(decryptedMap) : {};
      tableOverTime = sessionStorage.getItem("tableOverTime");
      tableOverTime = tableOverTime ? JSON.parse(tableOverTime) : [];
      decryptedTablesOverTime = sessionStorage.getItem(
        "decryptedTablesOverTime"
      );
      decryptedTablesOverTime = decryptedTablesOverTime
        ? JSON.parse(decryptedTablesOverTime)
        : [];
    }
  }
  return {
    game,
    players,
    table,
    hand,
    decryptedMap,
    tableOverTime,
    decryptedTablesOverTime,
  };
}

function eraseGameState() {
  sessionStorage.removeItem("lobby");
  sessionStorage.removeItem("game");
  sessionStorage.removeItem("players");
  sessionStorage.removeItem("table");
  sessionStorage.removeItem("hand");
  sessionStorage.removeItem("secretMap");
  sessionStorage.removeItem("decryptedMap");
  sessionStorage.removeItem("decryptedTablesOverTime");
}

function setGame(value: string) {
  sessionStorage.setItem("game", value);
}

function setPlayers(value: string[]) {
  sessionStorage.setItem("players", JSON.stringify(value));
}

function setHand(value: Card[]) {
  sessionStorage.setItem("hand", JSON.stringify(value));
}

function setTable(value: Table) {
  sessionStorage.setItem("table", JSON.stringify(value));
}

function setDecryptedMap(value: Map<number, string>) {
  sessionStorage.setItem("decryptedMap", JSON.stringify(value));
}

function setTableOverTime(value: Table[]) {
  sessionStorage.setItem("tableOverTime", JSON.stringify(value));
}

function setDecryptedTableOverTime(value: DecryptedTable[]) {
  sessionStorage.setItem("decryptedTablesOverTime", JSON.stringify(value));
}

function getDecryptedTableOverTime() {
  const tableOverTime = sessionStorage.getItem("decryptedTablesOverTime");
  return tableOverTime ? JSON.parse(tableOverTime) : [];
}
