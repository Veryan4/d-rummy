import { Card, EncryptedCard, PlayerHand } from "../models";
import { tableService } from "./table.service";

describe("tableService", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe("createInitialTable", () => {
    it("should initialize a table with the given user", () => {
      const table = tableService.createInitialTable("alice");
      expect(table.whoseTurn).toBe("");
      expect(table.playerOrder).toEqual([]);
      expect(table.deck).toEqual([]);
      expect(table.pile).toEqual([]);
      expect(table.hasDrawn).toBe(false);
      expect(table.turn).toBe(0);
      expect(table.players["alice"]).toBeInstanceOf(PlayerHand);
      expect(table.players["alice"].cards).toEqual([]);
      expect(table.players["alice"].encryptedCards).toEqual([]);
      expect(table.players["alice"].sets).toEqual([]);
    });
  });

  describe("isYourTurn", () => {
    it("should return true if it is the user's turn", () => {
      const table = tableService.createInitialTable("alice");
      table.whoseTurn = "alice";
      expect(tableService.isYourTurn(table, "alice")).toBe(true);
      expect(tableService.isYourTurn(table, "bob")).toBe(false);
    });
  });

  describe("playerHasCards", () => {
    it("should return false if player does not exist in table", () => {
      const table = tableService.createInitialTable("alice");
      expect(tableService.playerHasCards(table, "nonexistent")).toBe(false);
    });

    it("should return false if player has 0 cards and 0 encrypted cards", () => {
      const table = tableService.createInitialTable("alice");
      expect(tableService.playerHasCards(table, "alice")).toBe(false);
    });

    it("should return true if player has plain cards", () => {
      const table = tableService.createInitialTable("alice");
      table.players["alice"].cards = [new Card(1, 1)];
      expect(tableService.playerHasCards(table, "alice")).toBe(true);
    });

    it("should return true if player has encrypted cards", () => {
      const table = tableService.createInitialTable("alice");
      table.players["alice"].encryptedCards = [{ card: [1], id: 1, ivArr: [0] }];
      expect(tableService.playerHasCards(table, "alice")).toBe(true);
    });
  });

  describe("getNextPlayerTurn", () => {
    it("should advance turn to the next player in order and increment turn count", () => {
      const table = tableService.createInitialTable("alice");
      table.playerOrder = ["alice", "bob", "charlie"];
      table.whoseTurn = "alice";
      table.hasDrawn = true;
      table.turn = 1;

      const nextTable = tableService.getNextPlayerTurn(table);
      expect(nextTable.whoseTurn).toBe("bob");
      expect(nextTable.hasDrawn).toBe(false);
      expect(nextTable.turn).toBe(2);
    });

    it("should wrap around to the first player if at the end of player order", () => {
      const table = tableService.createInitialTable("alice");
      table.playerOrder = ["alice", "bob", "charlie"];
      table.whoseTurn = "charlie";
      table.hasDrawn = true;
      table.turn = 3;

      const nextTable = tableService.getNextPlayerTurn(table);
      expect(nextTable.whoseTurn).toBe("alice");
      expect(nextTable.hasDrawn).toBe(false);
      expect(nextTable.turn).toBe(4);
    });
  });

  describe("drawFromDeck", () => {
    it("should move the top card from the deck, set hasDrawn to true, and return the card", () => {
      const table = tableService.createInitialTable("alice");
      const card1: EncryptedCard = { card: [1], id: 1, ivArr: [0] };
      const card2: EncryptedCard = { card: [2], id: 2, ivArr: [0] };
      table.deck = [card1, card2];
      table.hasDrawn = false;

      const drawnCards = tableService.drawFromDeck(table);

      expect(table.hasDrawn).toBe(true);
      expect(drawnCards).toEqual([card1]);
      expect(table.deck).toEqual([card2]);
    });
  });

  describe("discardToPile", () => {
    it("should discard card to pile, unselect it, remove it from hand, and advance turn", () => {
      const table = tableService.createInitialTable("alice");
      table.playerOrder = ["alice", "bob"];
      table.whoseTurn = "alice";
      table.turn = 1;

      const cardToDiscard = new Card(1, 7);
      cardToDiscard.selected = true;
      const otherCard = new Card(2, 8);

      table.players["alice"].cards = [cardToDiscard, otherCard];
      const currentHand = [cardToDiscard, otherCard];
      const decryptedMap = new Map<number, string>();

      const { newTable, newHand } = tableService.discardToPile(
        table,
        "alice",
        cardToDiscard,
        currentHand,
        decryptedMap,
      );

      expect(cardToDiscard.selected).toBe(false);
      expect(newHand.map((c) => c.id)).toEqual(["2-8"]);
      expect(table.players["alice"].cards.map((c) => c.id)).toEqual(["2-8"]);
      expect(table.pile).toEqual([cardToDiscard]);
      expect(newTable.whoseTurn).toBe("bob");
      expect(newTable.turn).toBe(2);
      expect(newTable.hasDrawn).toBe(false);
    });
  });

  describe("addEncryptedCardsToHand", () => {
    it("should add encrypted cards to table, plain cards to hand, update decrypted map and store", () => {
      const table = tableService.createInitialTable("alice");
      const currentHand = [new Card(1, 1)];
      const decryptedMap = new Map<number, string>();
      const encryptedCards: EncryptedCard[] = [
        { card: [1, 2], id: 10, ivArr: [0] },
        { card: [3, 4], id: 11, ivArr: [0] },
      ];
      const cards = [new Card(2, 5), new Card(3, 8)];

      const { newHand } = tableService.addEncryptedCardsToHand(
        table,
        "alice",
        currentHand,
        decryptedMap,
        encryptedCards,
        cards,
      );

      expect(newHand.map((c) => c.id)).toEqual(["1-1", "2-5", "3-8"]);
      expect(table.players["alice"].encryptedCards).toEqual(encryptedCards);
      expect(decryptedMap.get(10)).toBe("2-5");
      expect(decryptedMap.get(11)).toBe("3-8");

      // Verify store was updated
      const storedHand = JSON.parse(sessionStorage.getItem("hand")!);
      expect(storedHand.map((c: Card) => c.id)).toEqual(["1-1", "2-5", "3-8"]);
    });
  });

  describe("addCardsToHand", () => {
    it("should append cards to player hand and table and update store", () => {
      const table = tableService.createInitialTable("alice");
      const currentHand = [new Card(1, 1)];
      table.players["alice"].cards = [new Card(1, 1)];
      const newCards = [new Card(2, 2), new Card(3, 3)];

      const { newHand } = tableService.addCardsToHand(
        table,
        "alice",
        currentHand,
        newCards,
      );

      expect(newHand.map((c) => c.id)).toEqual(["1-1", "2-2", "3-3"]);
      expect(table.players["alice"].cards.map((c) => c.id)).toEqual([
        "1-1",
        "2-2",
        "3-3",
      ]);

      const storedHand = JSON.parse(sessionStorage.getItem("hand")!);
      expect(storedHand.map((c: Card) => c.id)).toEqual(["1-1", "2-2", "3-3"]);
    });
  });

  describe("removeCardsFromHand", () => {
    it("should remove cards from encryptedCards, plain cards, and hand, updating store", () => {
      const table = tableService.createInitialTable("alice");
      const c1 = new Card(1, 1);
      const c2 = new Card(2, 2);
      const c3 = new Card(3, 3);

      const enc1: EncryptedCard = { card: [1], id: 10, ivArr: [0] };
      const enc2: EncryptedCard = { card: [2], id: 20, ivArr: [0] };

      const decryptedMap = new Map<number, string>([
        [10, "1-1"],
        [20, "2-2"],
      ]);

      table.players["alice"].encryptedCards = [enc1, enc2];
      table.players["alice"].cards = [c3];
      const currentHand = [c1, c2, c3];

      // Remove c1 (which is encrypted enc1) and c3 (which is plain)
      const { newHand } = tableService.removeCardsFromHand(
        table,
        "alice",
        currentHand,
        decryptedMap,
        [c1, c3],
      );

      expect(newHand.map((c) => c.id)).toEqual(["2-2"]);
      expect(table.players["alice"].encryptedCards).toEqual([enc2]);
      expect(table.players["alice"].cards).toEqual([]);

      const storedHand = JSON.parse(sessionStorage.getItem("hand")!);
      expect(storedHand.map((c: Card) => c.id)).toEqual(["2-2"]);
    });
  });
});
