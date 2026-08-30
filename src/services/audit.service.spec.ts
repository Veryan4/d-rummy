import {
  AuditEnum,
  Card,
  CheatEnum,
  EncryptedCard,
  PlayerHand,
  Table,
} from "../models";
import { auditService } from "./audit.service";
import { cardsService } from "./cards.service";
import { encryptService } from "./encrypt.service";

function createValidTablePair(): { lastTable: Table; table: Table } {
  const enc1: EncryptedCard = { card: [1, 2], id: 1, ivArr: [0] };
  const enc2: EncryptedCard = { card: [3, 4], id: 2, ivArr: [0] };

  const lastTable: Table = {
    turn: 1,
    whoseTurn: "alice",
    playerOrder: ["alice", "bob"],
    deck: [enc1, enc2],
    pile: [],
    hasDrawn: false,
    players: {
      alice: {
        cards: [new Card(1, 1)],
        encryptedCards: [{ card: [10], id: 10, ivArr: [0] }],
        sets: [],
        connected: true,
      },
      bob: {
        cards: [],
        encryptedCards: [{ card: [20], id: 20, ivArr: [0] }],
        sets: [],
        connected: true,
      },
    },
  };

  const table: Table = {
    turn: 2,
    whoseTurn: "bob",
    playerOrder: ["alice", "bob"],
    deck: [enc2], // 1 card drawn
    pile: [new Card(1, 1)], // alice discarded 1 card
    hasDrawn: false,
    players: {
      alice: {
        cards: [],
        encryptedCards: [{ card: [10], id: 10, ivArr: [0] }],
        sets: [],
        connected: true,
      },
      bob: {
        cards: [],
        encryptedCards: [{ card: [20], id: 20, ivArr: [0] }], // bob's hand unchanged
        sets: [],
        connected: true,
      },
    },
  };

  return { lastTable, table };
}

describe("auditService", () => {
  beforeEach(() => {
    sessionStorage.clear();
    encryptService.resetSecretMaps();
  });

  describe("cheatDetection", () => {
    it("should return null for a valid turn transition", () => {
      const { lastTable, table } = createValidTablePair();
      const cheat = auditService.cheatDetection(table, lastTable);
      expect(cheat).toBeNull();
    });

    it("should return unableToCheatDetect if lastTable is null or player not in playerOrder", () => {
      const { table } = createValidTablePair();
      expect(
        auditService.cheatDetection(table, null as any),
      ).toBe(CheatEnum.unableToCheatDetect);

      table.whoseTurn = "charlie";
      expect(
        auditService.cheatDetection(table, table),
      ).toBe(CheatEnum.unableToCheatDetect);
    });

    it("should detect outOfOrderTurns when turn is not consecutive", () => {
      const { lastTable, table } = createValidTablePair();
      table.turn = 5;
      expect(auditService.cheatDetection(table, lastTable)).toBe(
        CheatEnum.outOfOrderTurns,
      );
    });

    it("should detect playerTurnOrderChanged when playerOrder changes", () => {
      const { lastTable, table } = createValidTablePair();
      table.playerOrder = ["bob", "alice"];
      expect(auditService.cheatDetection(table, lastTable)).toBe(
        CheatEnum.playerTurnOrderChanged,
      );
    });

    it("should detect wrongPlayersTurn when whoseTurn was not previous player", () => {
      const { lastTable, table } = createValidTablePair();
      lastTable.whoseTurn = "bob"; // Alice should have been previous player before Bob
      expect(auditService.cheatDetection(table, lastTable)).toBe(
        CheatEnum.wrongPlayersTurn,
      );
    });

    it("should detect cardsTakenFromPileAndDeck when cards were improperly taken", () => {
      const { lastTable, table } = createValidTablePair();
      // deck length not decreased by 1, pile unchanged and pile length != 1
      lastTable.deck = [
        { card: [1], id: 1, ivArr: [0] },
        { card: [2], id: 2, ivArr: [0] },
      ];
      table.deck = [
        { card: [1], id: 1, ivArr: [0] },
        { card: [2], id: 2, ivArr: [0] },
      ];
      lastTable.pile = [new Card(1, 1), new Card(1, 2)];
      table.pile = [new Card(1, 1), new Card(1, 2)];

      expect(auditService.cheatDetection(table, lastTable)).toBe(
        CheatEnum.cardsTakenFromPileAndDeck,
      );
    });

    it("should detect otherPlayersHandsChanged when an inactive player's encryptedCards are modified", () => {
      const { lastTable, table } = createValidTablePair();
      // Bob is the next player (previous player was Alice). Modifying Bob's encrypted cards between turns:
      table.players["bob"].encryptedCards = [
        { card: [99, 99], id: 99, ivArr: [0] },
      ];
      expect(auditService.cheatDetection(table, lastTable)).toBe(
        CheatEnum.otherPlayersHandsChanged,
      );
    });

    it("should detect setsNotValid if other player's set is invalid", () => {
      const { lastTable, table } = createValidTablePair();
      // An invalid set on bob (other player)
      table.players["bob"].sets = [
        [new Card(1, 1), new Card(2, 5), new Card(3, 9)],
      ];
      expect(auditService.cheatDetection(table, lastTable)).toBe(
        CheatEnum.setsNotValid,
      );
    });

    it("should detect setsNotValid if previous player's set is invalid", () => {
      const { lastTable, table } = createValidTablePair();
      // An invalid set on alice (previous player)
      table.players["alice"].sets = [
        [new Card(1, 1), new Card(2, 5), new Card(3, 9)],
      ];
      expect(auditService.cheatDetection(table, lastTable)).toBe(
        CheatEnum.setsNotValid,
      );
    });
  });

  describe("audit and decryptTablesOverTime", () => {
    it("should perform full audit on a game history with 52 cards", async () => {
      // 1. Create a full standard 52-card deck
      const deckCards: Card[] = [];
      for (let c = 1; c <= 4; c++) {
        for (let v = 1; v <= 13; v++) {
          deckCards.push(new Card(c, v));
        }
      }

      // Alice encrypts deck
      encryptService.resetSecretMaps();
      const encryptedDeckAlice = await encryptService.encryptDeck(deckCards);
      const aliceSecrets = new Map(encryptService.secretMaps.at(-1)!);

      // Bob re-encrypts deck
      encryptService.resetSecretMaps();
      const encryptedDeckBob = await encryptService.reEncryptDeck(
        encryptedDeckAlice,
      );
      const bobSecrets = new Map(encryptService.secretMaps.at(-1)!);

      // Player order: ["alice", "bob"]. Decrypt order will be reverse: ["bob", "alice"].
      const playersSecrets = new Map<string, Map<number, JsonWebKey>[]>([
        ["alice", [aliceSecrets]],
        ["bob", [bobSecrets]],
      ]);

      const table0: Table = {
        turn: 0,
        whoseTurn: "alice",
        playerOrder: ["alice", "bob"],
        deck: encryptedDeckBob,
        pile: [],
        hasDrawn: false,
        players: {
          alice: { cards: [], encryptedCards: [], sets: [], connected: true },
          bob: { cards: [], encryptedCards: [], sets: [], connected: true },
        },
      };

      const result = await auditService.audit([table0], playersSecrets);

      expect(result.decryptedTablesOverTime.length).toBe(1);
      expect(result.decryptedTablesOverTime[0].deck.length).toBe(52);
      expect(result.audit.length).toBe(1);
      expect(result.audit[0].turn).toBe(0);
      expect(result.audit[0].infractions).toEqual([]);
    });

    it("should record wrongAmountOfTotalCards infraction when card count != 52", async () => {
      // Create a small 2-card deck
      const deckCards = [new Card(1, 1), new Card(1, 2)];

      encryptService.resetSecretMaps();
      const encAlice = await encryptService.encryptDeck(deckCards);
      const aliceSecrets = new Map(encryptService.secretMaps.at(-1)!);

      encryptService.resetSecretMaps();
      const encBob = await encryptService.reEncryptDeck(encAlice);
      const bobSecrets = new Map(encryptService.secretMaps.at(-1)!);

      const playersSecrets = new Map<string, Map<number, JsonWebKey>[]>([
        ["alice", [aliceSecrets]],
        ["bob", [bobSecrets]],
      ]);

      const table: Table = {
        turn: 1,
        whoseTurn: "alice",
        playerOrder: ["alice", "bob"],
        deck: encBob,
        pile: [],
        hasDrawn: false,
        players: {
          alice: { cards: [], encryptedCards: [], sets: [], connected: true },
          bob: { cards: [], encryptedCards: [], sets: [], connected: true },
        },
      };

      const result = await auditService.audit([table], playersSecrets);

      expect(result.audit[0].infractions).toContain(
        AuditEnum.wrongAmountOfTotalCards,
      );
    });

    it("should record notAllCardsAreUnique infraction when 52 cards contain duplicates", async () => {
      // 52 cards, but all are duplicate "1-1"
      const deckCards: Card[] = [];
      for (let i = 0; i < 52; i++) {
        deckCards.push(new Card(1, 1));
      }

      encryptService.resetSecretMaps();
      const encAlice = await encryptService.encryptDeck(deckCards);
      const aliceSecrets = new Map(encryptService.secretMaps.at(-1)!);

      encryptService.resetSecretMaps();
      const encBob = await encryptService.reEncryptDeck(encAlice);
      const bobSecrets = new Map(encryptService.secretMaps.at(-1)!);

      const playersSecrets = new Map<string, Map<number, JsonWebKey>[]>([
        ["alice", [aliceSecrets]],
        ["bob", [bobSecrets]],
      ]);

      const table: Table = {
        turn: 1,
        whoseTurn: "alice",
        playerOrder: ["alice", "bob"],
        deck: encBob,
        pile: [],
        hasDrawn: false,
        players: {
          alice: { cards: [], encryptedCards: [], sets: [], connected: true },
          bob: { cards: [], encryptedCards: [], sets: [], connected: true },
        },
      };

      const result = await auditService.audit([table], playersSecrets);

      expect(result.audit[0].infractions).toContain(
        AuditEnum.notAllCardsAreUnique,
      );
    });
  });
});
