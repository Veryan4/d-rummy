import { Card, EncryptedCard, PlayerHand } from "../models";
import { rummyService } from "./rummy.service";
import { tableService } from "./table.service";

describe("rummyService", () => {
  beforeEach(() => {
    sessionStorage.clear();
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

    it("should return empty array for empty order", () => {
      expect(rummyService.getNextRematchPlayerOrder([])).toEqual([]);
    });
  });

  describe("dealInitialCards", () => {
    it("should return null if the player already has cards", () => {
      const table = tableService.createInitialTable("alice");
      table.players["alice"].cards = [new Card(1, 1)];
      expect(rummyService.dealInitialCards(table, "alice")).toBeNull();
    });

    it("should deal 7 cards from top of deck to the first player", () => {
      const table = tableService.createInitialTable("alice");
      table.players["bob"] = new PlayerHand();
      table.playerOrder = ["alice", "bob"];

      const deck: EncryptedCard[] = [];
      for (let i = 1; i <= 20; i++) {
        deck.push({ card: [i], id: i, ivArr: [0] });
      }
      table.deck = [...deck];

      const dealtCards = rummyService.dealInitialCards(table, "alice");

      expect(dealtCards).not.toBeNull();
      expect(dealtCards!.length).toBe(7);
      expect(dealtCards!.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(table.deck.length).toBe(13);
    });

    it("should deal 7 cards to second player when first player already has encrypted cards", () => {
      const table = tableService.createInitialTable("alice");
      table.players["alice"].encryptedCards = [
        { card: [1], id: 1, ivArr: [0] },
      ];
      table.players["bob"] = new PlayerHand();
      table.playerOrder = ["alice", "bob"];

      const deck: EncryptedCard[] = [];
      for (let i = 1; i <= 10; i++) {
        deck.push({ card: [i], id: i, ivArr: [0] });
      }
      table.deck = [...deck];

      const dealtCards = rummyService.dealInitialCards(table, "bob");
      expect(dealtCards).not.toBeNull();
      expect(dealtCards!.length).toBe(7);
      expect(table.deck.length).toBe(3);
    });

    it("should return null for second player if first player does not have cards yet", () => {
      const table = tableService.createInitialTable("alice");
      table.players["bob"] = new PlayerHand();
      table.playerOrder = ["alice", "bob"];
      table.deck = [{ card: [1], id: 1, ivArr: [0] }];

      const dealtCards = rummyService.dealInitialCards(table, "bob");
      expect(dealtCards).toBeNull();
    });
  });

  describe("canDrawFromDeck", () => {
    it("should return false if table.hasDrawn is true", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "alice";
      table.players["alice"].cards = [new Card(1, 1)];
      table.deck = [{ card: [1], id: 1, ivArr: [0] }];
      table.hasDrawn = true;

      expect(rummyService.canDrawFromDeck(table, "alice")).toEqual({
        allowed: false,
      });
    });

    it("should return false if any player has no cards", () => {
      const table = tableService.createInitialTable("alice");
      table.players["bob"] = new PlayerHand();
      table.playerOrder = ["alice", "bob"];
      table.players["alice"].cards = [new Card(1, 1)];
      // Bob has 0 cards
      table.whoseTurn = "alice";
      table.deck = [{ card: [1], id: 1, ivArr: [0] }];

      expect(rummyService.canDrawFromDeck(table, "alice")).toEqual({
        allowed: false,
      });
    });

    it("should return error if not user's turn", () => {
      const table = tableService.createInitialTable("alice");
      table.players["alice"].cards = [new Card(1, 1)];
      table.playerOrder = ["alice"];
      table.whoseTurn = "bob";
      table.deck = [{ card: [1], id: 1, ivArr: [0] }];

      expect(rummyService.canDrawFromDeck(table, "alice")).toEqual({
        allowed: false,
        error: "rummy.error.wait_your_turn",
      });
    });

    it("should return needsFlip when deck is empty", () => {
      const table = tableService.createInitialTable("alice");
      table.players["alice"].cards = [new Card(1, 1)];
      table.playerOrder = ["alice"];
      table.whoseTurn = "alice";
      table.deck = [];

      expect(rummyService.canDrawFromDeck(table, "alice")).toEqual({
        allowed: false,
        needsFlip: true,
      });
    });

    it("should allow drawing when valid", () => {
      const table = tableService.createInitialTable("alice");
      table.players["alice"].cards = [new Card(1, 1)];
      table.playerOrder = ["alice"];
      table.whoseTurn = "alice";
      table.deck = [{ card: [1], id: 1, ivArr: [0] }];

      expect(rummyService.canDrawFromDeck(table, "alice")).toEqual({
        allowed: true,
      });
    });
  });

  describe("canDrawFromPile", () => {
    it("should return false if hasDrawn is true", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "alice";
      table.pile = [new Card(1, 1)];
      table.hasDrawn = true;

      expect(rummyService.canDrawFromPile(table, "alice")).toEqual({
        allowed: false,
      });
    });

    it("should return false if pile is empty", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "alice";
      table.pile = [];

      expect(rummyService.canDrawFromPile(table, "alice")).toEqual({
        allowed: false,
      });
    });

    it("should return error if not user's turn", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "bob";
      table.pile = [new Card(1, 1)];

      expect(rummyService.canDrawFromPile(table, "alice")).toEqual({
        allowed: false,
        error: "rummy.error.wait_your_turn",
      });
    });

    it("should allow drawing from pile when valid", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "alice";
      table.pile = [new Card(1, 1)];

      expect(rummyService.canDrawFromPile(table, "alice")).toEqual({
        allowed: true,
      });
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

    it("should fail if set is not a valid rummy set", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "alice";
      const cards = [new Card(1, 1), new Card(2, 5), new Card(3, 9)];
      const result = rummyService.placeNewSet(
        table,
        "alice",
        cards,
        cards,
        new Map(),
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("rummy.error.need_valid_set");
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

    it("should fail if not user turn", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "bob";
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
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("rummy.error.wait_your_turn");
    });

    it("should fail if player has not drawn yet", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "alice";
      table.hasDrawn = false;
      const targetSet = [new Card(1, 2), new Card(1, 3), new Card(1, 4)];
      const selectedCard = new Card(1, 5);

      const result = rummyService.placeSet(
        table,
        "alice",
        [selectedCard],
        targetSet,
        [selectedCard],
        new Map(),
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("rummy.error.draw_to_start");
    });

    it("should fail if resulting set has less than 3 cards", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "alice";
      table.hasDrawn = true;
      const targetSet = [new Card(1, 2)];
      const selectedCard = new Card(1, 3);

      const result = rummyService.placeSet(
        table,
        "alice",
        [selectedCard],
        targetSet,
        [selectedCard],
        new Map(),
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("rummy.error.need_3_cards");
    });

    it("should fail if resulting set is not valid", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "alice";
      table.hasDrawn = true;
      const targetSet = [new Card(1, 2), new Card(1, 3), new Card(1, 4)];
      const invalidCard = new Card(2, 9);

      const result = rummyService.placeSet(
        table,
        "alice",
        [invalidCard],
        targetSet,
        [invalidCard],
        new Map(),
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("rummy.error.need_valid_set");
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

    it("should successfully place on another player's set with toast message", () => {
      const table = tableService.createInitialTable("alice");
      table.players["bob"] = new PlayerHand();
      table.whoseTurn = "alice";
      table.hasDrawn = true;

      // Alice already has placed a set
      table.players["alice"].sets = [
        [new Card(1, 1), new Card(2, 1), new Card(3, 1)],
      ];

      // Bob has an existing straight
      const bobSet = [new Card(1, 2), new Card(1, 3), new Card(1, 4)];
      table.players["bob"].sets = [bobSet];

      const selectedCard = new Card(1, 5);
      table.players["alice"].cards = [selectedCard];

      const result = rummyService.placeSet(
        table,
        "alice",
        [selectedCard],
        bobSet,
        [selectedCard],
        new Map(),
        "bob",
      );

      expect(result.success).toBe(true);
      expect(result.toastMessage).toBe("rummy.place_other_set");
      expect(result.toastParams).toEqual({ from: "alice", to: "bob" });
      expect(table.players["bob"].sets[0].length).toBe(4);
      expect(result.newHand).toEqual([]);
    });
  });

  describe("isValidRummySet", () => {
    it("should return true for 3 or 4 cards with matching values (three/four of a kind)", () => {
      const threeOfAKind = [
        new Card(1, 7),
        new Card(2, 7),
        new Card(3, 7),
      ];
      expect(rummyService.isValidRummySet(threeOfAKind)).toBe(true);

      const fourOfAKind = [
        new Card(1, 10),
        new Card(2, 10),
        new Card(3, 10),
        new Card(4, 10),
      ];
      expect(rummyService.isValidRummySet(fourOfAKind)).toBe(true);
    });

    it("should return true for a valid straight of the same suit", () => {
      const straight = [
        new Card(1, 3),
        new Card(1, 4),
        new Card(1, 5),
        new Card(1, 6),
      ];
      expect(rummyService.isValidRummySet(straight)).toBe(true);
    });

    it("should return false for a straight with mixed suits", () => {
      const mixedStraight = [
        new Card(1, 3),
        new Card(2, 4),
        new Card(1, 5),
      ];
      expect(rummyService.isValidRummySet(mixedStraight)).toBe(false);
    });

    it("should return false for non-consecutive ranks in a single suit", () => {
      const nonConsecutive = [
        new Card(1, 3),
        new Card(1, 5),
        new Card(1, 6),
      ];
      expect(rummyService.isValidRummySet(nonConsecutive)).toBe(false);
    });

    it("should return false if there are duplicate cards in a straight", () => {
      const duplicates = [
        new Card(1, 3),
        new Card(1, 3),
        new Card(1, 4),
      ];
      expect(rummyService.isValidRummySet(duplicates)).toBe(false);
    });
  });

  describe("validateDiscard", () => {
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
      // Not user's turn
      expect(
        rummyService.validateDiscard(table, "bob", [new Card(1, 1)]).error,
      ).toBe("rummy.error.wait_your_turn");

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
