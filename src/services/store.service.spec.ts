import {
  Card,
  Table,
  DecryptedTable,
  Audit,
  AuditEnum,
  PlayerHand,
} from "../models";
import { storeService } from "./store.service";

// Mock Web Storage
function createStorageMock() {
  let storage: Record<string, string> = {};
  return {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      storage = {};
    },
  };
}

const mockSessionStorage = createStorageMock();
const mockLocalStorage = createStorageMock();

Object.defineProperty(globalThis, "sessionStorage", {
  value: mockSessionStorage,
  writable: true,
});

Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

describe("storeService", () => {
  beforeEach(() => {
    mockSessionStorage.clear();
    mockLocalStorage.clear();
  });

  describe("game state management", () => {
    it("should return empty/undefined game state when nothing is stored", () => {
      const state = storeService.getGameState();
      expect(state.game).toBeNull();
      expect(state.players).toBeNull();
      expect(state.table).toBeNull();
      expect(state.hand).toBeUndefined();
      expect(state.decryptedMap).toBeUndefined();
      expect(state.tableOverTime).toBeUndefined();
      expect(state.decryptedTablesOverTime).toBeUndefined();
    });

    it("should set and get game name", () => {
      storeService.setGame("rummy");
      expect(mockSessionStorage.getItem("game")).toBe("rummy");
    });

    it("should leave gameType unset until a valid type is persisted", () => {
      expect(storeService.getGameType()).toBeNull();
      storeService.setGameType("crazy-eights");
      expect(storeService.getGameType()).toBe("crazy-eights");
      mockSessionStorage.setItem("gameType", "poker");
      expect(storeService.getGameType()).toBeNull();
      storeService.setGameType("rummy");
      expect(storeService.getGameType()).toBe("rummy");
    });

    it("should not erase gameType when erasing game state", () => {
      storeService.setGameType("crazy-eights");
      storeService.eraseGameState();
      expect(storeService.getGameType()).toBe("crazy-eights");
    });

    it("should clear the stored lobby host without touching gameType", () => {
      storeService.setGame("Alice-uuid");
      storeService.setGameType("crazy-eights");
      storeService.clearGameHost();
      expect(storeService.getGameState().game).toBeNull();
      expect(storeService.getGameType()).toBe("crazy-eights");
    });

    it("should set and get players", () => {
      const players = ["alice", "bob"];
      storeService.setPlayers(players);
      expect(JSON.parse(mockSessionStorage.getItem("players")!)).toEqual(
        players,
      );
    });

    it("should set hand", () => {
      const hand = [new Card(1, 1), new Card(2, 5)];
      storeService.setHand(hand);
      const stored = JSON.parse(mockSessionStorage.getItem("hand")!);
      expect(stored.length).toBe(2);
      expect(stored[0].id).toBe("1-1");
    });

    it("should set and retrieve complete game state when table exists", () => {
      storeService.setGame("rummy");
      storeService.setPlayers(["alice", "bob"]);

      const table = new Table();
      table.turn = 2;
      table.whoseTurn = "alice";
      table.players = { alice: new PlayerHand() };
      storeService.setTable(table);

      const hand = [new Card(1, 5)];
      storeService.setHand(hand);

      const decryptedMap = new Map<number, string>([
        [1, "1-5"],
        [2, "2-8"],
      ]);
      storeService.setDecryptedMap(decryptedMap);

      storeService.setTableOverTime([table]);

      const decryptedTables: DecryptedTable[] = [
        {
          players: { alice: { cards: [new Card(1, 5)], sets: [] } },
          playerOrder: ["alice"],
          whoseTurn: "alice",
          deck: [],
          pile: [],
          hasDrawn: true,
          turn: 1,
        },
      ];
      storeService.setDecryptedTableOverTime(decryptedTables);

      const state = storeService.getGameState();
      expect(state.game).toBe("rummy");
      expect(state.players).toEqual(["alice", "bob"]);
      expect(state.table.turn).toBe(2);
      expect(state.hand?.length).toBe(1);
      expect(state.hand?.[0].id).toBe("1-5");
      expect(state.decryptedMap?.get(1)).toBe("1-5");
      expect(state.decryptedMap?.get(2)).toBe("2-8");
      expect(state.tableOverTime?.length).toBe(1);
      expect(state.decryptedTablesOverTime?.length).toBe(1);
    });

    it("should handle getGameState with table but empty subfields", () => {
      const table = new Table();
      storeService.setTable(table);

      const state = storeService.getGameState();
      expect(state.table).toBeDefined();
      expect(state.hand).toEqual([]);
      expect(state.decryptedMap?.size).toBe(0);
      expect(state.tableOverTime).toEqual([]);
      expect(state.decryptedTablesOverTime).toEqual([]);
    });

    it("should erase game state from sessionStorage", () => {
      mockSessionStorage.setItem("lobby", "lobby123");
      mockSessionStorage.setItem("game", "rummy");
      mockSessionStorage.setItem("players", JSON.stringify(["alice"]));
      mockSessionStorage.setItem("table", JSON.stringify(new Table()));
      mockSessionStorage.setItem("hand", JSON.stringify([]));
      mockSessionStorage.setItem("secretMap", JSON.stringify([]));
      mockSessionStorage.setItem("decryptedMap", JSON.stringify({}));
      mockSessionStorage.setItem("decryptedTablesOverTime", JSON.stringify([]));
      mockSessionStorage.setItem("tableOverTime", JSON.stringify([{ turn: 1 }]));

      storeService.eraseGameState();

      expect(mockSessionStorage.getItem("lobby")).toBeNull();
      expect(mockSessionStorage.getItem("game")).toBeNull();
      expect(mockSessionStorage.getItem("players")).toBeNull();
      expect(mockSessionStorage.getItem("table")).toBeNull();
      expect(mockSessionStorage.getItem("hand")).toBeNull();
      expect(mockSessionStorage.getItem("secretMap")).toBeNull();
      expect(mockSessionStorage.getItem("decryptedMap")).toBeNull();
      expect(mockSessionStorage.getItem("decryptedTablesOverTime")).toBeNull();
      expect(mockSessionStorage.getItem("tableOverTime")).toBeNull();
    });

    it("should erase lobby state", () => {
      mockSessionStorage.setItem("params", "testParams");
      mockSessionStorage.setItem("lobby", "testLobby");

      storeService.eraseLobbyState();

      expect(mockSessionStorage.getItem("params")).toBeNull();
      expect(mockSessionStorage.getItem("lobby")).toBeNull();
    });
  });

  describe("decrypted map management", () => {
    it("should set and get decrypted map correctly converting between Map and Object", () => {
      const map = new Map<number, string>();
      map.set(10, "1-10");
      map.set(25, "3-12");

      storeService.setDecryptedMap(map);
      storeService.setTable(new Table());

      const state = storeService.getGameState();
      expect(state.decryptedMap?.size).toBe(2);
      expect(state.decryptedMap?.get(10)).toBe("1-10");
      expect(state.decryptedMap?.get(25)).toBe("3-12");
    });
  });

  describe("audit state management", () => {
    it("should return empty audit state when storage is empty", () => {
      const auditState = storeService.getAuditState();
      expect(auditState.decryptedTablesOverTime).toEqual([]);
      expect(auditState.audit).toEqual([]);
    });

    it("should set audit and get audit state", () => {
      const audits: Audit[] = [
        { turn: 1, infractions: [AuditEnum.wrongAmountOfTotalCards] },
      ];
      storeService.setAudit(audits);

      const auditState = storeService.getAuditState();
      expect(auditState.audit).toEqual(audits);
    });

    it("should set decrypted table over time in both localStorage and sessionStorage", () => {
      const decryptedTables: DecryptedTable[] = [
        {
          players: {},
          playerOrder: ["alice"],
          whoseTurn: "alice",
          deck: [],
          pile: [],
          hasDrawn: false,
          turn: 0,
        },
      ];

      storeService.setDecryptedTableOverTime(decryptedTables);

      expect(
        JSON.parse(mockLocalStorage.getItem("decryptedTablesOverTime")!),
      ).toEqual(decryptedTables);
      expect(
        JSON.parse(mockSessionStorage.getItem("decryptedTablesOverTime")!),
      ).toEqual(decryptedTables);

      expect(storeService.getDecryptedTableOverTime()).toEqual(decryptedTables);
    });

    it("should return empty array for getDecryptedTableOverTime when not set", () => {
      expect(storeService.getDecryptedTableOverTime()).toEqual([]);
    });
  });
});
