import { Card, Table } from "../models";

export const storeService = {
  getGameState,
  eraseGameState,
  setPlayers,
  setHand,
  setTable,
  setDecryptedMap,
  setTableOverTime,
  setGame,
};

function getGameState() {
  let game, players, table, hand, decryptedMap, tableOverTime;
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
    }
  }
  return { game, players, table, hand, decryptedMap, tableOverTime };
}

function eraseGameState() {
  sessionStorage.removeItem("lobby");
  sessionStorage.removeItem("game");
  sessionStorage.removeItem("players");
  sessionStorage.removeItem("table");
  sessionStorage.removeItem("hand");
  sessionStorage.removeItem("secretMap");
  sessionStorage.removeItem("decryptedMap");
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
