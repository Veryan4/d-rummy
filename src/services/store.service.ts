import { Audit, Card, DecryptedTable, Table } from "../models";

export const storeService = {
  getGameState,
  getAuditState,
  eraseGameState,
  eraseLobbyState,
  setPlayers,
  setHand,
  setTable,
  setDecryptedMap,
  setTableOverTime,
  setGame,
  setDecryptedTableOverTime,
  getDecryptedTableOverTime,
  setAudit,
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
  }
  table = sessionStorage.getItem("table");
  if (table) {
    table = JSON.parse(table);
    hand = sessionStorage.getItem("hand");
    hand = hand ? JSON.parse(hand) : [];
    decryptedMap = getDecryptedMap();
    tableOverTime = sessionStorage.getItem("tableOverTime");
    tableOverTime = tableOverTime ? JSON.parse(tableOverTime) : [];
    decryptedTablesOverTime = sessionStorage.getItem("decryptedTablesOverTime");
    decryptedTablesOverTime = decryptedTablesOverTime
      ? JSON.parse(decryptedTablesOverTime)
      : [];
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

function getAuditState() {
  let decryptedTablesOverTime, audit;
  decryptedTablesOverTime = localStorage.getItem("decryptedTablesOverTime");
  decryptedTablesOverTime = decryptedTablesOverTime
    ? JSON.parse(decryptedTablesOverTime)
    : [];
  audit = localStorage.getItem("audit");
  audit = audit ? JSON.parse(audit) : [];
  return {
    decryptedTablesOverTime,
    audit,
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

function eraseLobbyState() {
  sessionStorage.removeItem("params");
  sessionStorage.removeItem("lobby");
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
  const map = Object.fromEntries(value);
  sessionStorage.setItem("decryptedMap", JSON.stringify(map));
}

function getDecryptedMap() {
  const decryptedMapString = sessionStorage.getItem("decryptedMap");
  const decryptedMap: Record<string, string> = decryptedMapString
    ? JSON.parse(decryptedMapString)
    : {};
  const map = new Map<number, string>();
  Object.entries(decryptedMap).map(([k, v]) => map.set(Number(k), v));
  return map;
}

function setTableOverTime(value: Table[]) {
  sessionStorage.setItem("tableOverTime", JSON.stringify(value));
}

function setDecryptedTableOverTime(value: DecryptedTable[]) {
  const str = JSON.stringify(value);
  localStorage.setItem("decryptedTablesOverTime", str);
  sessionStorage.setItem("decryptedTablesOverTime", str);
}

function setAudit(value: Audit[]) {
  localStorage.setItem("audit", JSON.stringify(value));
}

function getDecryptedTableOverTime() {
  const tableOverTime = sessionStorage.getItem("decryptedTablesOverTime");
  return tableOverTime ? JSON.parse(tableOverTime) : [];
}
