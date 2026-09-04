import { Card, EncryptedCard, PlayerHand, Table } from "../../models";
import { tableService } from "../../services/table.service";
import { crazyEightsService } from "./rules";

function makeTable(players: string[], opts?: Partial<Table>): Table {
  const table = tableService.createInitialTable(players[0]);
  table.gameId = "crazy-eights";
  table.playerOrder = players;
  table.whoseTurn = players[0];
  table.turn = 1;
  table.pile = [new Card(1, 6)];
  table.crazyEights = {
    currentSuit: "♠",
    direction: 1,
    pendingDraw: 0,
  };
  players.forEach((p) => {
    if (!table.players[p]) {
      table.players[p] = new PlayerHand();
    }
    table.players[p].encryptedCards = [{ card: [1], id: 1, ivArr: [0] }];
    table.players[p].cards = [];
  });
  Object.assign(table, opts);
  return table;
}

describe("crazyEightsService", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe("dealCount", () => {
    it("deals 7 cards for 2 players and 5 otherwise", () => {
      expect(crazyEightsService.dealCount(2)).toBe(7);
      expect(crazyEightsService.dealCount(3)).toBe(5);
      expect(crazyEightsService.dealCount(5)).toBe(5);
    });
  });

  describe("dealInitialCards", () => {
    it("deals 7 cards to the first of two players", () => {
      const table = makeTable(["alice", "bob"]);
      table.turn = 0;
      table.pile = [];
      table.players["alice"].encryptedCards = [];
      table.players["bob"].encryptedCards = [];
      const deck: EncryptedCard[] = [];
      for (let i = 1; i <= 20; i++) {
        deck.push({ card: [i], id: i, ivArr: [0] });
      }
      table.deck = deck;

      const dealt = crazyEightsService.dealInitialCards(table, "alice");
      expect(dealt?.length).toBe(7);
      expect(table.deck.length).toBe(13);
    });

    it("deals 5 cards when there are 3 players", () => {
      const table = makeTable(["alice", "bob", "cara"]);
      table.turn = 0;
      table.pile = [];
      table.players["alice"].encryptedCards = [];
      table.players["bob"].encryptedCards = [];
      table.players["cara"].encryptedCards = [];
      const deck: EncryptedCard[] = [];
      for (let i = 1; i <= 20; i++) {
        deck.push({ card: [i], id: i, ivArr: [0] });
      }
      table.deck = deck;

      const dealt = crazyEightsService.dealInitialCards(table, "alice");
      expect(dealt?.length).toBe(5);
    });
  });

  describe("isLegalPlay", () => {
    it("allows matching suit, matching rank, or an 8", () => {
      const table = makeTable(["alice", "bob"]);
      expect(crazyEightsService.isLegalPlay(table, new Card(1, 3))).toBe(true);
      expect(crazyEightsService.isLegalPlay(table, new Card(2, 6))).toBe(true);
      expect(crazyEightsService.isLegalPlay(table, new Card(4, 8))).toBe(true);
      expect(crazyEightsService.isLegalPlay(table, new Card(2, 3))).toBe(false);
    });

    it("allows no plays while a draw penalty is pending", () => {
      const table = makeTable(["alice", "bob"]);
      table.crazyEights!.pendingDraw = 2;
      expect(crazyEightsService.isLegalPlay(table, new Card(1, 2))).toBe(false);
      expect(crazyEightsService.isLegalPlay(table, new Card(1, 8))).toBe(false);
      expect(crazyEightsService.isLegalPlay(table, new Card(1, 6))).toBe(false);
    });
  });

  describe("playCard", () => {
    function handWith(table: Table, user: string, cards: Card[]) {
      table.players[user].cards = cards;
      table.players[user].encryptedCards = [];
      return cards;
    }

    it("rejects an illegal card", () => {
      const table = makeTable(["alice", "bob"]);
      const card = new Card(2, 3);
      const result = crazyEightsService.playCard(
        table,
        "alice",
        card,
        handWith(table, "alice", [card]),
        new Map(),
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("crazyEights.error.illegal_play");
    });

    it("skips the next player when a Queen is played", () => {
      const table = makeTable(["alice", "bob", "cara"]);
      const queen = new Card(1, 12);
      const result = crazyEightsService.playCard(
        table,
        "alice",
        queen,
        handWith(table, "alice", [queen, new Card(2, 4)]),
        new Map(),
      );
      expect(result.success).toBe(true);
      expect(table.crazyEights!.direction).toBe(1);
      expect(table.whoseTurn).toBe("cara");
    });

    it("skips one player after a Queen with four players", () => {
      const table = makeTable(["alice", "bob", "cara", "dave"]);
      const queen = new Card(1, 12);
      crazyEightsService.playCard(
        table,
        "alice",
        queen,
        handWith(table, "alice", [queen, new Card(2, 4)]),
        new Map(),
      );
      expect(table.crazyEights!.direction).toBe(1);
      expect(table.whoseTurn).toBe("cara");
    });

    it("skips the opponent on Queen in a 2-player game", () => {
      const table = makeTable(["alice", "bob"]);
      const queen = new Card(1, 12);
      crazyEightsService.playCard(
        table,
        "alice",
        queen,
        handWith(table, "alice", [queen, new Card(2, 4)]),
        new Map(),
      );
      expect(table.crazyEights!.direction).toBe(1);
      expect(table.whoseTurn).toBe("alice");
    });

    it("reverses direction on Ace; with 3 players the previous player is next", () => {
      const table = makeTable(["alice", "bob", "cara"]);
      const ace = new Card(1, 1);
      crazyEightsService.playCard(
        table,
        "alice",
        ace,
        handWith(table, "alice", [ace, new Card(2, 4)]),
        new Map(),
      );
      expect(table.crazyEights!.direction).toBe(-1);
      expect(table.whoseTurn).toBe("cara");
    });

    it("still passes to the opponent after an Ace in a 2-player game", () => {
      const table = makeTable(["alice", "bob"]);
      const ace = new Card(1, 1);
      crazyEightsService.playCard(
        table,
        "alice",
        ace,
        handWith(table, "alice", [ace, new Card(2, 4)]),
        new Map(),
      );
      expect(table.whoseTurn).toBe("bob");
    });

    it("rejects playing a 2 until the draw penalty is taken", () => {
      const table = makeTable(["alice", "bob"]);
      const two = new Card(1, 2);
      crazyEightsService.playCard(
        table,
        "alice",
        two,
        handWith(table, "alice", [two, new Card(3, 4)]),
        new Map(),
      );
      expect(table.crazyEights!.pendingDraw).toBe(2);
      expect(table.whoseTurn).toBe("bob");

      const two2 = new Card(2, 2);
      const result = crazyEightsService.playCard(
        table,
        "bob",
        two2,
        handWith(table, "bob", [two2, new Card(3, 5)]),
        new Map(),
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("crazyEights.error.must_respond_to_draw");
      expect(table.crazyEights!.pendingDraw).toBe(2);
    });

    it("sets currentSuit from a declared 8", () => {
      const table = makeTable(["alice", "bob"]);
      const eight = new Card(2, 8);
      crazyEightsService.playCard(
        table,
        "alice",
        eight,
        handWith(table, "alice", [eight, new Card(3, 4)]),
        new Map(),
        "♥",
      );
      expect(table.crazyEights!.currentSuit).toBe("♥");
      expect(table.pile.at(-1)?.rank).toBe("8");
    });

    it("wins on a last Queen without skipping", () => {
      const table = makeTable(["alice", "bob", "cara"]);
      const queen = new Card(1, 12);
      const result = crazyEightsService.playCard(
        table,
        "alice",
        queen,
        handWith(table, "alice", [queen]),
        new Map(),
      );
      expect(result.winner).toBe("alice");
      expect(table.whoseTurn).toBe("alice");
      expect(table.turn).toBe(2);
      expect(table.crazyEights!.direction).toBe(1);
    });

    it("wins on a last 8 without applying the declared suit", () => {
      const table = makeTable(["alice", "bob"]);
      const eight = new Card(2, 8);
      const result = crazyEightsService.playCard(
        table,
        "alice",
        eight,
        handWith(table, "alice", [eight]),
        new Map(),
        "♥",
      );
      expect(result.winner).toBe("alice");
      expect(table.turn).toBe(2);
      expect(table.whoseTurn).toBe("alice");
      expect(table.crazyEights!.currentSuit).toBe("♠");
    });
  });

  describe("recyclePile", () => {
    it("keeps the top card and returns the rest to encrypt", () => {
      const table = makeTable(["alice", "bob"]);
      const top = new Card(1, 6);
      const older = new Card(2, 9);
      table.pile = [older, top];
      const { cardsToEncrypt, retained } = crazyEightsService.recyclePile(table);
      expect(retained[0].id).toBe(top.id);
      expect(table.pile).toEqual([top]);
      expect(cardsToEncrypt.map((c) => c.id)).toEqual([older.id]);
    });

    it("does not mutate the pile when listing cards to recycle", () => {
      const table = makeTable(["alice", "bob"]);
      const top = new Card(1, 6);
      const older = new Card(2, 9);
      table.pile = [older, top];
      const { cardsToEncrypt, retained } =
        crazyEightsService.recyclePileCards(table.pile);
      expect(table.pile).toEqual([older, top]);
      expect(retained[0].id).toBe(top.id);
      expect(cardsToEncrypt.map((c) => c.id)).toEqual([older.id]);
    });
  });

  describe("canPass", () => {
    it("allows a pass only when stock is empty, pile has one card, and no legal play", () => {
      const table = makeTable(["alice", "bob"]);
      table.deck = [];
      table.pile = [new Card(1, 6)];
      const unplayable = [new Card(2, 3)];
      expect(
        crazyEightsService.canPass(table, "alice", unplayable).allowed,
      ).toBe(true);
      expect(
        crazyEightsService.canPass(table, "alice", [new Card(1, 3)]).allowed,
      ).toBe(false);
    });

    it("asks to recycle when the pile has more than the top card", () => {
      const table = makeTable(["alice", "bob"]);
      table.deck = [];
      table.pile = [new Card(2, 9), new Card(1, 6)];
      const result = crazyEightsService.canPass(table, "alice", [
        new Card(2, 3),
      ]);
      expect(result.allowed).toBe(false);
      expect(result.needsRecycle).toBe(true);
    });
  });

  describe("isGameOver", () => {
    it("returns the player with an empty hand after the upcard exists", () => {
      const table = makeTable(["alice", "bob"]);
      table.players["alice"].encryptedCards = [];
      table.players["alice"].cards = [];
      expect(crazyEightsService.isGameOver(table)).toBe("alice");
    });

    it("does not end during the deal when the pile is empty", () => {
      const table = makeTable(["alice", "bob"]);
      table.pile = [];
      table.players["alice"].encryptedCards = [];
      expect(crazyEightsService.isGameOver(table)).toBeNull();
    });
  });

  describe("nextPlayerAfter", () => {
    it("wraps around clockwise", () => {
      const table = makeTable(["alice", "bob", "cara"]);
      table.whoseTurn = "cara";
      expect(crazyEightsService.nextPlayerAfter(table, "cara", 0)).toBe("alice");
    });
  });

  describe("playerSkippedByQueen", () => {
    it("returns the next player skipped by a Queen", () => {
      const previous = makeTable(["alice", "bob", "cara"]);
      const table = structuredClone(previous);
      const queen = new Card(1, 12);
      table.players["alice"].cards = [queen, new Card(2, 4)];
      table.players["alice"].encryptedCards = [];
      crazyEightsService.playCard(
        table,
        "alice",
        queen,
        table.players["alice"].cards,
        new Map(),
      );
      expect(crazyEightsService.playerSkippedByQueen(previous, table)).toBe(
        "bob",
      );
    });

    it("returns the opponent skipped by a Queen in a 2-player game", () => {
      const previous = makeTable(["alice", "bob"]);
      const table = structuredClone(previous);
      const queen = new Card(1, 12);
      table.players["alice"].cards = [queen, new Card(2, 4)];
      table.players["alice"].encryptedCards = [];
      crazyEightsService.playCard(
        table,
        "alice",
        queen,
        table.players["alice"].cards,
        new Map(),
      );
      expect(crazyEightsService.playerSkippedByQueen(previous, table)).toBe(
        "bob",
      );
    });

    it("returns null when a non-Queen is played", () => {
      const previous = makeTable(["alice", "bob"]);
      const table = structuredClone(previous);
      const six = new Card(1, 7);
      table.players["alice"].cards = [six, new Card(2, 4)];
      table.players["alice"].encryptedCards = [];
      crazyEightsService.playCard(
        table,
        "alice",
        six,
        table.players["alice"].cards,
        new Map(),
      );
      expect(
        crazyEightsService.playerSkippedByQueen(previous, table),
      ).toBeNull();
    });

    it("returns the previous player when a Queen is played counterclockwise", () => {
      const previous = makeTable(["alice", "bob", "cara"]);
      previous.crazyEights!.direction = -1;
      const table = structuredClone(previous);
      const queen = new Card(1, 12);
      table.players["alice"].cards = [queen, new Card(2, 4)];
      table.players["alice"].encryptedCards = [];
      crazyEightsService.playCard(
        table,
        "alice",
        queen,
        table.players["alice"].cards,
        new Map(),
      );
      expect(crazyEightsService.playerSkippedByQueen(previous, table)).toBe(
        "cara",
      );
    });

    it("returns null when a last Queen wins without skipping", () => {
      const previous = makeTable(["alice", "bob", "cara"]);
      const table = structuredClone(previous);
      const queen = new Card(1, 12);
      table.players["alice"].cards = [queen];
      table.players["alice"].encryptedCards = [];
      crazyEightsService.playCard(
        table,
        "alice",
        queen,
        table.players["alice"].cards,
        new Map(),
      );
      expect(
        crazyEightsService.playerSkippedByQueen(previous, table),
      ).toBeNull();
    });
  });

  describe("finishPenalty", () => {
    it("clears pendingDraw and leaves the turn with that player", () => {
      const table = makeTable(["alice", "bob"]);
      table.crazyEights!.pendingDraw = 4;
      crazyEightsService.finishPenalty(table, "alice");
      expect(table.crazyEights!.pendingDraw).toBe(0);
      expect(table.whoseTurn).toBe("alice");
      expect(table.turn).toBe(1);
      expect(table.hasDrawn).toBe(true);
    });

    it("allows a 2 to be played only after the penalty is drawn", () => {
      const table = makeTable(["alice", "bob"]);
      table.whoseTurn = "bob";
      table.crazyEights!.pendingDraw = 2;
      crazyEightsService.finishPenalty(table, "bob");
      const two = new Card(1, 2);
      table.players["bob"].cards = [two, new Card(3, 5)];
      table.players["bob"].encryptedCards = [];
      const result = crazyEightsService.playCard(
        table,
        "bob",
        two,
        table.players["bob"].cards,
        new Map(),
      );
      expect(result.success).toBe(true);
      expect(table.crazyEights!.pendingDraw).toBe(2);
      expect(table.whoseTurn).toBe("alice");
    });

    it("allows a card to be played after the penalty is drawn", () => {
      const table = makeTable(["alice", "bob"]);
      table.crazyEights!.pendingDraw = 2;
      crazyEightsService.finishPenalty(table, "alice");
      const card = new Card(1, 3);
      table.players["alice"].cards = [card, new Card(2, 4)];
      table.players["alice"].encryptedCards = [];
      const result = crazyEightsService.playCard(
        table,
        "alice",
        card,
        table.players["alice"].cards,
        new Map(),
      );
      expect(result.success).toBe(true);
      expect(table.whoseTurn).toBe("bob");
    });
  });
});
