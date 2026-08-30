import { Card } from "../models";
import { rummyService } from "./rummy.service";
import { tableService } from "./table.service";

// Mock sessionStorage for Node test environment
const mockStorage: Record<string, string> = {};
(globalThis as any).sessionStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
};

describe("rummyService", () => {
  beforeEach(() => {
    (globalThis as any).sessionStorage.clear();
  });

  describe("isGameOver", () => {
    it("should return null if turn is 0", () => {
      const table = tableService.createInitialTable("alice");
      table.playerOrder = ["alice", "bob"];
      expect(rummyService.isGameOver(table)).toBeNull();
    });

    it("should return the winning player when someone has no cards left on turn > 0", () => {
      const table = tableService.createInitialTable("alice");
      table.players["bob"] = {
        cards: [new Card(1, 2)],
        encryptedCards: [],
        sets: [],
        connected: true,
      };
      table.playerOrder = ["alice", "bob"];
      table.turn = 1;

      // Alice has 0 cards
      expect(rummyService.isGameOver(table)).toBe("alice");
    });
  });

  describe("getNextRematchPlayerOrder", () => {
    it("should rotate players order", () => {
      const order = ["alice", "bob", "charlie"];
      const nextOrder = rummyService.getNextRematchPlayerOrder(order);
      expect(nextOrder).toEqual(["bob", "charlie", "alice"]);
    });
  });

  describe("drawFromPile", () => {
    it("should add pile cards to player cards and hand", () => {
      const table = tableService.createInitialTable("alice");
      const card = new Card(1, 5);
      table.pile = [card];

      const { newHand } = rummyService.drawFromPile(table, "alice", []);
      expect(newHand).toEqual([card]);
      expect(table.players["alice"].cards).toEqual([card]);
      expect(table.pile).toEqual([]);
      expect(table.hasDrawn).toBe(true);
    });
  });

  describe("formatSet", () => {
    it("should sort cards by value and clear selected flag", () => {
      const c1 = new Card(1, 5);
      c1.selected = true;
      const c2 = new Card(1, 3);
      c2.selected = true;
      const c3 = new Card(1, 4);

      const set = rummyService.formatSet([c1, c2, c3]);
      expect(set.map((c) => c.value)).toEqual([3, 4, 5]);
      expect(set.every((c) => !c.selected)).toBe(true);
    });
  });

  describe("placeNewSet", () => {
    it("should fail if not user turn", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "bob";
      const cards = [new Card(1, 1), new Card(1, 2), new Card(1, 3)];
      const result = rummyService.placeNewSet(
        table,
        "alice",
        cards,
        cards,
        new Map(),
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("rummy.error.wait_your_turn");
    });

    it("should fail if less than 3 cards", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "alice";
      const cards = [new Card(1, 1), new Card(1, 2)];
      const result = rummyService.placeNewSet(
        table,
        "alice",
        cards,
        cards,
        new Map(),
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("rummy.error.need_3_cards");
    });

    it("should successfully place a valid 3-card straight", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "alice";
      const cards = [new Card(1, 2), new Card(1, 3), new Card(1, 4)];
      table.players["alice"].cards = [...cards];

      const result = rummyService.placeNewSet(
        table,
        "alice",
        cards,
        cards,
        new Map(),
      );
      expect(result.success).toBe(true);
      expect(table.players["alice"].sets.length).toBe(1);
      expect(result.newHand).toEqual([]);
      expect(table.players["alice"].cards).toEqual([]);
    });
  });

  describe("placeSet", () => {
    it("should fail if playing on other player without having placed own set first", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "alice";
      table.hasDrawn = true;
      const targetSet = [new Card(1, 2), new Card(1, 3), new Card(1, 4)];
      const selectedCard = new Card(1, 5);

      const result = rummyService.placeSet(
        table,
        "alice",
        [selectedCard],
        targetSet,
        [selectedCard],
        new Map(),
        "bob",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("rummy.error.place_set_first");
    });

    it("should successfully extend an existing set when player has placed a set", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "alice";
      table.hasDrawn = true;
      const existingSet = [new Card(1, 2), new Card(1, 3), new Card(1, 4)];
      table.players["alice"].sets = [existingSet];
      const selectedCard = new Card(1, 5);
      table.players["alice"].cards = [selectedCard];

      const result = rummyService.placeSet(
        table,
        "alice",
        [selectedCard],
        existingSet,
        [selectedCard],
        new Map(),
      );
      expect(result.success).toBe(true);
      expect(table.players["alice"].sets[0].length).toBe(4);
      expect(result.newHand).toEqual([]);
    });
  });

  describe("validateDiscard and discardToPile", () => {
    it("should validate that exactly 1 card is selected after drawing", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "alice";
      table.playerOrder = ["alice", "bob"];
      table.hasDrawn = false;

      // Has not drawn
      expect(rummyService.validateDiscard(table, "alice", []).valid).toBe(
        false,
      );

      table.hasDrawn = true;
      // No card selected
      expect(rummyService.validateDiscard(table, "alice", []).error).toBe(
        "rummy.error.select_discard",
      );

      const card1 = new Card(1, 1);
      const card2 = new Card(1, 2);
      // Multiple cards selected
      expect(
        rummyService.validateDiscard(table, "alice", [card1, card2]).error,
      ).toBe("rummy.error.only_discard_1");

      // Exactly 1 card selected
      expect(rummyService.validateDiscard(table, "alice", [card1]).valid).toBe(
        true,
      );
    });
  });
});
