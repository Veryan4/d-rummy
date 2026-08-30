import { Card, PlayerHand, Table, EncryptedCard } from "../models";
import { cardsService } from "./cards.service";

describe("cardsService", () => {
  describe("createDeck", () => {
    it("should create a standard deck of 52 cards by default", () => {
      const deck = cardsService.createDeck();
      expect(deck.length).toBe(52);

      const uniqueIds = new Set(deck.map((c) => c.id));
      expect(uniqueIds.size).toBe(52);

      // Verify colors and values distribution
      for (let color = 1; color <= 4; color++) {
        for (let val = 1; val <= 13; val++) {
          expect(uniqueIds.has(`${color}-${val}`)).toBe(true);
        }
      }
    });

    it("should create a custom sized deck with custom colors and values", () => {
      const deck = cardsService.createDeck(2, 5);
      expect(deck.length).toBe(10);
      const uniqueIds = new Set(deck.map((c) => c.id));
      expect(uniqueIds.size).toBe(10);
      expect(uniqueIds.has("1-1")).toBe(true);
      expect(uniqueIds.has("2-5")).toBe(true);
      expect(uniqueIds.has("3-1")).toBe(false);
    });
  });

  describe("createDeckWithOffset", () => {
    it("should create a deck with specified offsets", () => {
      const deck = cardsService.createDeckWithOffset(2, 3, 2, 5);
      // Colors 2..3 (count 2: 2, 3), values 5..7 (count 3: 5, 6, 7) => 6 cards
      expect(deck.length).toBe(6);
      const ids = deck.map((c) => c.id);
      expect(ids).toContain("2-5");
      expect(ids).toContain("2-6");
      expect(ids).toContain("2-7");
      expect(ids).toContain("3-5");
      expect(ids).toContain("3-6");
      expect(ids).toContain("3-7");
    });
  });

  describe("merge", () => {
    it("should merge arrays into target array and empty the sources", () => {
      const target: Card[] = [new Card(1, 1)];
      const source1: Card[] = [new Card(1, 2), new Card(1, 3)];
      const source2: Card[] = [new Card(1, 4)];

      cardsService.merge(target, [source1, source2]);

      expect(target.length).toBe(4);
      expect(target.map((c) => c.value)).toEqual([1, 2, 3, 4]);
      expect(source1.length).toBe(0);
      expect(source2.length).toBe(0);
    });
  });

  describe("shuffle", () => {
    it("should return an array with the same elements", () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = cardsService.shuffle([...original]);
      expect(shuffled.length).toBe(original.length);
      expect(shuffled.sort((a, b) => a - b)).toEqual(original);
    });

    it("should handle empty or single-element arrays", () => {
      expect(cardsService.shuffle([])).toEqual([]);
      expect(cardsService.shuffle([42])).toEqual([42]);
    });
  });

  describe("flip", () => {
    it("should reverse array in-place", () => {
      const cards = [new Card(1, 1), new Card(1, 2), new Card(1, 3)];
      cardsService.flip(cards);
      expect(cards.map((c) => c.value)).toEqual([3, 2, 1]);
    });
  });

  describe("split", () => {
    it("should split cards at given index and modify original in-place", () => {
      const cards = [
        new Card(1, 1),
        new Card(1, 2),
        new Card(1, 3),
        new Card(1, 4),
      ];
      const splitPortion = cardsService.split(cards, 2);

      expect(cards.map((c) => c.value)).toEqual([1, 2]);
      expect(splitPortion.map((c) => c.value)).toEqual([3, 4]);
    });
  });

  describe("moveCard", () => {
    it("should move card from top to top (shift -> unshift)", () => {
      const src = [1, 2, 3];
      const dest = [4, 5];
      cardsService.moveCard(src, dest, "top", "top");
      expect(src).toEqual([2, 3]);
      expect(dest).toEqual([1, 4, 5]);
    });

    it("should move card from top to bottom (shift -> push)", () => {
      const src = [1, 2, 3];
      const dest = [4, 5];
      cardsService.moveCard(src, dest, "top", "bottom");
      expect(src).toEqual([2, 3]);
      expect(dest).toEqual([4, 5, 1]);
    });

    it("should move card from bottom to top (pop -> unshift)", () => {
      const src = [1, 2, 3];
      const dest = [4, 5];
      cardsService.moveCard(src, dest, "bottom", "top");
      expect(src).toEqual([1, 2]);
      expect(dest).toEqual([3, 4, 5]);
    });

    it("should move card from bottom to bottom (pop -> push)", () => {
      const src = [1, 2, 3];
      const dest = [4, 5];
      cardsService.moveCard(src, dest, "bottom", "bottom");
      expect(src).toEqual([1, 2]);
      expect(dest).toEqual([4, 5, 3]);
    });
  });

  describe("moveCards", () => {
    it("should move multiple cards", () => {
      const src = [1, 2, 3, 4];
      const dest = [5, 6];
      cardsService.moveCards(src, dest, "top", "bottom", 2);
      expect(src).toEqual([3, 4]);
      expect(dest).toEqual([5, 6, 1, 2]);
    });
  });

  describe("moveCardsFromIndex", () => {
    it("should move cards from index to top with reverse order", () => {
      const c1 = new Card(1, 1);
      const c2 = new Card(1, 2);
      const c3 = new Card(1, 3);
      const c4 = new Card(1, 4);
      const src = [c1, c2, c3, c4];
      const dest = [new Card(1, 9)];

      cardsService.moveCardsFromIndex(src, dest, "top", 2, 1);
      // Removed c2, c3 from src
      expect(src.map((c) => c.value)).toEqual([1, 4]);
      // Reversed [c3, c2] then unshifted to dest
      expect(dest.map((c) => c.value)).toEqual([2, 3, 9]);
    });

    it("should move cards from index to bottom preserving order", () => {
      const c1 = new Card(1, 1);
      const c2 = new Card(1, 2);
      const c3 = new Card(1, 3);
      const c4 = new Card(1, 4);
      const src = [c1, c2, c3, c4];
      const dest = [new Card(1, 9)];

      cardsService.moveCardsFromIndex(src, dest, "bottom", 2, 1);
      expect(src.map((c) => c.value)).toEqual([1, 4]);
      expect(dest.map((c) => c.value)).toEqual([9, 2, 3]);
    });
  });

  describe("areArraysEqual", () => {
    it("should return true for identical arrays", () => {
      expect(cardsService.areArraysEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(cardsService.areArraysEqual([], [])).toBe(true);
    });

    it("should return false for different length arrays", () => {
      expect(cardsService.areArraysEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it("should return false for different values", () => {
      expect(cardsService.areArraysEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });
  });

  describe("areSetOfEncryptedCardsEqual", () => {
    it("should return true for matching encrypted cards", () => {
      const e1: EncryptedCard = { card: [1, 2, 3], id: 1, ivArr: [0] };
      const e2: EncryptedCard = { card: [1, 2, 3], id: 2, ivArr: [1] };
      expect(cardsService.areSetOfEncryptedCardsEqual([e1], [e2])).toBe(true);
    });

    it("should return false when cards mismatch or lengths differ", () => {
      const e1: EncryptedCard = { card: [1, 2, 3], id: 1, ivArr: [0] };
      const e2: EncryptedCard = { card: [1, 2, 4], id: 1, ivArr: [0] };
      expect(cardsService.areSetOfEncryptedCardsEqual([e1], [e2])).toBe(false);
      expect(cardsService.areSetOfEncryptedCardsEqual([e1], [])).toBe(false);
    });
  });

  describe("areHandsEqual", () => {
    it("should return true for equal hands", () => {
      const hand1 = new PlayerHand();
      hand1.cards = [new Card(1, 2)];
      hand1.sets = [[new Card(1, 3), new Card(1, 4), new Card(1, 5)]];
      hand1.encryptedCards = [{ card: [1, 2], id: 1, ivArr: [0] }];
      hand1.connected = true;

      const hand2 = new PlayerHand();
      hand2.cards = [new Card(1, 2)];
      hand2.sets = [[new Card(1, 3), new Card(1, 4), new Card(1, 5)]];
      hand2.encryptedCards = [{ card: [1, 2], id: 1, ivArr: [0] }];
      hand2.connected = true;

      expect(cardsService.areHandsEqual(hand1, hand2)).toBe(true);
    });

    it("should return false when connected, cards, encryptedCards, or sets differ", () => {
      const base = () => {
        const h = new PlayerHand();
        h.cards = [new Card(1, 2)];
        h.sets = [[new Card(1, 3), new Card(1, 4), new Card(1, 5)]];
        h.encryptedCards = [{ card: [1, 2], id: 1, ivArr: [0] }];
        h.connected = true;
        return h;
      };

      const h1 = base();
      const h2 = base();
      h2.connected = false;
      expect(cardsService.areHandsEqual(h1, h2)).toBe(false);

      const h3 = base();
      h3.cards = [new Card(1, 3)];
      expect(cardsService.areHandsEqual(h1, h3)).toBe(false);

      const h4 = base();
      h4.encryptedCards = [{ card: [9, 9], id: 1, ivArr: [0] }];
      expect(cardsService.areHandsEqual(h1, h4)).toBe(false);

      const h5 = base();
      h5.sets = [];
      expect(cardsService.areHandsEqual(h1, h5)).toBe(false);
    });
  });

  describe("areTablesEqual", () => {
    it("should return true for identical tables", () => {
      const t1 = new Table();
      t1.turn = 1;
      t1.whoseTurn = "alice";
      t1.hasDrawn = false;
      t1.deck = [{ card: [1], id: 1, ivArr: [0] }];
      t1.pile = [new Card(1, 5)];
      t1.playerOrder = ["alice"];
      t1.players = { alice: new PlayerHand() };

      const t2 = new Table();
      t2.turn = 1;
      t2.whoseTurn = "alice";
      t2.hasDrawn = false;
      t2.deck = [{ card: [1], id: 1, ivArr: [0] }];
      t2.pile = [new Card(1, 5)];
      t2.playerOrder = ["alice"];
      t2.players = { alice: new PlayerHand() };

      expect(cardsService.areTablesEqual(t1, t2)).toBe(true);
    });

    it("should return false if turn, whoseTurn, hasDrawn, deck, pile, or players differ", () => {
      const createTable = () => {
        const t = new Table();
        t.turn = 1;
        t.whoseTurn = "alice";
        t.hasDrawn = false;
        t.deck = [{ card: [1], id: 1, ivArr: [0] }];
        t.pile = [new Card(1, 5)];
        t.playerOrder = ["alice"];
        t.players = { alice: new PlayerHand() };
        return t;
      };

      const t1 = createTable();
      const t2 = createTable();
      t2.hasDrawn = true;
      expect(cardsService.areTablesEqual(t1, t2)).toBe(false);

      const t3 = createTable();
      t3.whoseTurn = "bob";
      expect(cardsService.areTablesEqual(t1, t3)).toBe(false);

      const t4 = createTable();
      t4.turn = 2;
      expect(cardsService.areTablesEqual(t1, t4)).toBe(false);

      const t5 = createTable();
      t5.pile = [new Card(1, 6)];
      expect(cardsService.areTablesEqual(t1, t5)).toBe(false);

      const t6 = createTable();
      t6.deck = [{ card: [2], id: 1, ivArr: [0] }];
      expect(cardsService.areTablesEqual(t1, t6)).toBe(false);

      const t7 = createTable();
      t7.players["alice"].connected = false;
      expect(cardsService.areTablesEqual(t1, t7)).toBe(false);
    });
  });
});
