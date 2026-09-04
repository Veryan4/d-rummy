import { Card, CheatEnum, DecryptedTable, Table } from "../../models";
import { crazyEightsCheatDetection, collapseCrazyEightsForcedDraws, tableFromDecrypted } from "./audit";

function basePair() {
  const lastTable: Table = {
    gameId: "crazy-eights",
    turn: 1,
    whoseTurn: "alice",
    playerOrder: ["alice", "bob", "cara"],
    deck: [{ card: [1], id: 1, ivArr: [0] }],
    pile: [new Card(1, 6)],
    hasDrawn: false,
    crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 0 },
    players: {
      alice: {
        cards: [new Card(1, 12), new Card(2, 4)],
        encryptedCards: [],
        sets: [],
        connected: true,
      },
      bob: {
        cards: [],
        encryptedCards: [{ card: [2], id: 2, ivArr: [0] }],
        sets: [],
        connected: true,
      },
      cara: {
        cards: [],
        encryptedCards: [{ card: [3], id: 3, ivArr: [0] }],
        sets: [],
        connected: true,
      },
    },
  };
  const table = structuredClone(lastTable);
  table.turn = 2;
  return { lastTable, table };
}

describe("crazyEightsCheatDetection", () => {
  it("accepts a Queen skip to cara", () => {
    const { lastTable, table } = basePair();
    table.whoseTurn = "cara";
    table.pile = [...lastTable.pile, new Card(1, 12)];
    table.players["alice"].cards = [new Card(2, 4)];
    expect(crazyEightsCheatDetection(table, lastTable)).toBeNull();
  });

  it("accepts a 2-player Queen that skips the opponent", () => {
    const lastTable: Table = {
      gameId: "crazy-eights",
      turn: 1,
      whoseTurn: "alice",
      playerOrder: ["alice", "bob"],
      deck: [{ card: [1], id: 1, ivArr: [0] }],
      pile: [new Card(1, 6)],
      hasDrawn: false,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 0 },
      players: {
        alice: {
          cards: [new Card(1, 12), new Card(2, 4)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
        bob: {
          cards: [],
          encryptedCards: [{ card: [2], id: 2, ivArr: [0] }],
          sets: [],
          connected: true,
        },
      },
    };
    const table = structuredClone(lastTable);
    table.turn = 2;
    table.whoseTurn = "alice";
    table.pile = [...lastTable.pile, new Card(1, 12)];
    table.players["alice"].cards = [new Card(2, 4)];
    expect(crazyEightsCheatDetection(table, lastTable)).toBeNull();
  });

  it("flags an illegal card", () => {
    const { lastTable, table } = basePair();
    table.whoseTurn = "bob";
    table.pile = [...lastTable.pile, new Card(3, 5)];
    table.players["alice"].cards = [new Card(2, 4)];
    expect(crazyEightsCheatDetection(table, lastTable)).toBe(
      CheatEnum.illegalCardPlayed,
    );
  });

  it("flags the wrong next player", () => {
    const { lastTable, table } = basePair();
    table.whoseTurn = "bob";
    table.pile = [...lastTable.pile, new Card(1, 12)];
    table.players["alice"].cards = [new Card(2, 4)];
    expect(crazyEightsCheatDetection(table, lastTable)).toBe(
      CheatEnum.wrongNextPlayer,
    );
  });

  it("accepts playing a 2 and passing the turn with a pending draw", () => {
    const { lastTable, table } = basePair();
    const two = new Card(1, 2);
    lastTable.players["alice"].cards = [two, new Card(2, 4)];
    table.whoseTurn = "bob";
    table.pile = [...lastTable.pile, two];
    table.players["alice"].cards = [new Card(2, 4)];
    table.crazyEights = { currentSuit: "♠", direction: 1, pendingDraw: 2 };
    expect(crazyEightsCheatDetection(table, lastTable)).toBeNull();
  });

  it("accepts a 2 and the forced draw as a single play step", () => {
    const { lastTable, table } = basePair();
    const two = new Card(1, 2);
    lastTable.players["alice"].cards = [two, new Card(2, 4)];
    lastTable.deck = [
      { card: [1], id: 1, ivArr: [0] },
      { card: [2], id: 2, ivArr: [0] },
    ];
    table.whoseTurn = "bob";
    table.hasDrawn = true;
    table.pile = [...lastTable.pile, two];
    table.players["alice"].cards = [new Card(2, 4)];
    table.deck = [];
    table.players["bob"].encryptedCards = [
      { card: [2], id: 2, ivArr: [0] },
      { card: [1], id: 1, ivArr: [0] },
      { card: [2], id: 2, ivArr: [0] },
    ];
    table.crazyEights = { currentSuit: "♠", direction: 1, pendingDraw: 0 };
    expect(crazyEightsCheatDetection(table, lastTable)).toBeNull();
  });

  it("collapses a forced-draw snapshot into the 2 that caused it", () => {
    const afterTwo: DecryptedTable = {
      gameId: "crazy-eights",
      turn: 2,
      whoseTurn: "bob",
      playerOrder: ["alice", "bob"],
      deck: [new Card(1, 5), new Card(1, 6)],
      pile: [new Card(1, 6), new Card(1, 2)],
      hasDrawn: false,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 2 },
      players: {
        alice: { cards: [new Card(2, 4)], sets: [] },
        bob: { cards: [new Card(1, 3)], sets: [] },
      },
    };
    const afterDraw = structuredClone(afterTwo);
    afterDraw.hasDrawn = true;
    afterDraw.crazyEights!.pendingDraw = 0;
    afterDraw.deck = [];
    afterDraw.players["bob"].cards = [
      new Card(1, 3),
      new Card(1, 5),
      new Card(1, 6),
    ];
    const collapsed = collapseCrazyEightsForcedDraws([afterTwo, afterDraw]);
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].crazyEights?.pendingDraw).toBe(0);
    expect(collapsed[0].players["bob"].cards).toHaveLength(3);
  });

  it("keeps the opening table separate from the first play", () => {
    const opening: DecryptedTable = {
      gameId: "crazy-eights",
      turn: 0,
      whoseTurn: "alice",
      playerOrder: ["alice", "bob"],
      deck: [new Card(1, 5)],
      pile: [new Card(1, 6)],
      hasDrawn: false,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 0 },
      players: {
        alice: { cards: [new Card(1, 12), new Card(2, 4)], sets: [] },
        bob: { cards: [new Card(1, 3)], sets: [] },
      },
    };
    const firstPlay = structuredClone(opening);
    firstPlay.turn = 1;
    firstPlay.whoseTurn = "bob";
    firstPlay.pile = [...opening.pile, new Card(1, 12)];
    firstPlay.players["alice"].cards = [new Card(2, 4)];
    const collapsed = collapseCrazyEightsForcedDraws([opening, firstPlay]);
    expect(collapsed).toHaveLength(2);
    expect(collapsed[0].turn).toBe(0);
    expect(collapsed[1].turn).toBe(1);
  });

  it("accepts the same-turn auto-draw that clears a 2 penalty", () => {
    const lastTable: Table = {
      gameId: "crazy-eights",
      turn: 2,
      whoseTurn: "bob",
      playerOrder: ["alice", "bob"],
      deck: [
        { card: [1], id: 1, ivArr: [0] },
        { card: [2], id: 2, ivArr: [0] },
      ],
      pile: [new Card(1, 6), new Card(1, 2)],
      hasDrawn: false,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 2 },
      players: {
        alice: {
          cards: [new Card(2, 4)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
        bob: {
          cards: [new Card(1, 3)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
      },
    };
    const table = structuredClone(lastTable);
    table.hasDrawn = true;
    table.crazyEights!.pendingDraw = 0;
    table.deck = [];
    table.players["bob"].encryptedCards = [
      { card: [1], id: 1, ivArr: [0] },
      { card: [2], id: 2, ivArr: [0] },
    ];
    expect(crazyEightsCheatDetection(table, lastTable)).toBeNull();
  });

  it("accepts a decrypted 2-penalty pair the way post-game audit sees it", () => {
    const last: DecryptedTable = {
      gameId: "crazy-eights",
      turn: 2,
      whoseTurn: "bob",
      playerOrder: ["alice", "bob"],
      deck: [new Card(1, 5), new Card(1, 6)],
      pile: [new Card(1, 6), new Card(1, 2)],
      hasDrawn: false,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 2 },
      players: {
        alice: { cards: [new Card(2, 4)], sets: [] },
        bob: { cards: [new Card(1, 3)], sets: [] },
      },
    };
    const next = structuredClone(last);
    next.hasDrawn = true;
    next.crazyEights!.pendingDraw = 0;
    next.deck = [];
    next.players["bob"].cards = [
      new Card(1, 3),
      new Card(1, 5),
      new Card(1, 6),
    ];
    expect(
      crazyEightsCheatDetection(
        tableFromDecrypted(next),
        tableFromDecrypted(last),
      ),
    ).toBeNull();
  });

  it("accepts a hasDrawn-only snapshot while a 2 penalty is still pending", () => {
    const lastTable: Table = {
      gameId: "crazy-eights",
      turn: 2,
      whoseTurn: "bob",
      playerOrder: ["alice", "bob"],
      deck: [
        { card: [1], id: 1, ivArr: [0] },
        { card: [2], id: 2, ivArr: [0] },
      ],
      pile: [new Card(1, 6), new Card(1, 2)],
      hasDrawn: false,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 2 },
      players: {
        alice: {
          cards: [new Card(2, 4)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
        bob: {
          cards: [new Card(1, 3)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
      },
    };
    const table = structuredClone(lastTable);
    table.hasDrawn = true;
    expect(crazyEightsCheatDetection(table, lastTable)).toBeNull();
  });

  it("accepts taking penalty cards from the stock before they appear in hand", () => {
    const lastTable: Table = {
      gameId: "crazy-eights",
      turn: 2,
      whoseTurn: "bob",
      playerOrder: ["alice", "bob"],
      deck: [
        { card: [1], id: 1, ivArr: [0] },
        { card: [2], id: 2, ivArr: [0] },
      ],
      pile: [new Card(1, 6), new Card(1, 2)],
      hasDrawn: false,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 2 },
      players: {
        alice: {
          cards: [new Card(2, 4)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
        bob: {
          cards: [new Card(1, 3)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
      },
    };
    const taken = structuredClone(lastTable);
    taken.hasDrawn = true;
    taken.deck = [];
    expect(crazyEightsCheatDetection(taken, lastTable)).toBeNull();

    const finished = structuredClone(taken);
    finished.crazyEights!.pendingDraw = 0;
    finished.players["bob"].encryptedCards = [
      { card: [1], id: 1, ivArr: [0] },
      { card: [2], id: 2, ivArr: [0] },
    ];
    expect(crazyEightsCheatDetection(finished, taken)).toBeNull();
  });

  it("accepts a 2 penalty draw even if turn advanced with the same player", () => {
    const lastTable: Table = {
      gameId: "crazy-eights",
      turn: 2,
      whoseTurn: "bob",
      playerOrder: ["alice", "bob"],
      deck: [
        { card: [1], id: 1, ivArr: [0] },
        { card: [2], id: 2, ivArr: [0] },
      ],
      pile: [new Card(1, 6), new Card(1, 2)],
      hasDrawn: false,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 2 },
      players: {
        alice: {
          cards: [new Card(2, 4)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
        bob: {
          cards: [new Card(1, 3)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
      },
    };
    const table = structuredClone(lastTable);
    table.turn = 3;
    table.hasDrawn = true;
    table.crazyEights!.pendingDraw = 0;
    table.deck = [];
    table.players["bob"].encryptedCards = [
      { card: [1], id: 1, ivArr: [0] },
      { card: [2], id: 2, ivArr: [0] },
    ];
    expect(crazyEightsCheatDetection(table, lastTable)).toBeNull();
  });

  it("accepts a play after a 2 when the last snapshot still has pendingDraw", () => {
    const lastTable: Table = {
      gameId: "crazy-eights",
      turn: 2,
      whoseTurn: "bob",
      playerOrder: ["alice", "bob"],
      deck: [
        { card: [1], id: 1, ivArr: [0] },
        { card: [2], id: 2, ivArr: [0] },
      ],
      pile: [new Card(1, 6), new Card(1, 2)],
      hasDrawn: false,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 2 },
      players: {
        alice: {
          cards: [new Card(2, 4)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
        bob: {
          cards: [new Card(1, 3), new Card(1, 12)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
      },
    };
    const table = structuredClone(lastTable);
    table.turn = 3;
    table.whoseTurn = "bob";
    table.hasDrawn = false;
    table.crazyEights = { currentSuit: "♠", direction: 1, pendingDraw: 0 };
    table.pile = [...lastTable.pile, new Card(1, 12)];
    table.players["bob"].cards = [new Card(1, 3)];
    table.deck = [];
    table.players["bob"].encryptedCards = [
      { card: [1], id: 1, ivArr: [0] },
      { card: [2], id: 2, ivArr: [0] },
    ];
    expect(crazyEightsCheatDetection(table, lastTable)).toBeNull();
  });

  it("still flags a skipped turn when pendingDraw is not involved", () => {
    const { lastTable, table } = basePair();
    table.turn = 3;
    table.whoseTurn = "bob";
    table.pile = [...lastTable.pile, new Card(1, 5)];
    table.players["alice"].cards = [new Card(2, 4)];
    expect(crazyEightsCheatDetection(table, lastTable)).toBe(
      CheatEnum.outOfOrderTurns,
    );
  });

  it("flags a pass that empties the actor's hand", () => {
    const { lastTable, table } = basePair();
    table.whoseTurn = "bob";
    table.players["alice"].cards = [];
    table.players["alice"].encryptedCards = [];
    expect(crazyEightsCheatDetection(table, lastTable)).toBe(
      CheatEnum.invalidCrazyEightsState,
    );
  });

  it("flags a play that grows the pile by two", () => {
    const { lastTable, table } = basePair();
    table.whoseTurn = "bob";
    table.pile = [...lastTable.pile, new Card(1, 12), new Card(2, 4)];
    table.players["alice"].cards = [];
    expect(crazyEightsCheatDetection(table, lastTable)).toBe(
      CheatEnum.invalidCrazyEightsState,
    );
  });

  it("flags a play that also shrinks the deck", () => {
    const { lastTable, table } = basePair();
    table.whoseTurn = "bob";
    table.pile = [...lastTable.pile, new Card(1, 12)];
    table.players["alice"].cards = [new Card(2, 4)];
    table.deck = [];
    expect(crazyEightsCheatDetection(table, lastTable)).toBe(
      CheatEnum.invalidCrazyEightsState,
    );
  });

  it("accepts a same-turn recycle that keeps the top card", () => {
    const lastTable: Table = {
      gameId: "crazy-eights",
      turn: 2,
      whoseTurn: "bob",
      playerOrder: ["alice", "bob"],
      deck: [],
      pile: [new Card(2, 9), new Card(1, 6)],
      hasDrawn: false,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 0 },
      players: {
        alice: {
          cards: [new Card(2, 4)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
        bob: {
          cards: [new Card(1, 3)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
      },
    };
    const table = structuredClone(lastTable);
    table.deck = [
      { card: [9], id: 9, ivArr: [0] },
      { card: [10], id: 10, ivArr: [0] },
    ];
    table.pile = [new Card(1, 6)];
    expect(crazyEightsCheatDetection(table, lastTable)).toBeNull();
  });

  it("accepts a voluntary draw as its own same-turn snapshot", () => {
    const lastTable: Table = {
      gameId: "crazy-eights",
      turn: 2,
      whoseTurn: "bob",
      playerOrder: ["alice", "bob"],
      deck: [{ card: [1], id: 1, ivArr: [0] }],
      pile: [new Card(1, 6)],
      hasDrawn: false,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 0 },
      players: {
        alice: {
          cards: [new Card(2, 4)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
        bob: {
          cards: [new Card(1, 3)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
      },
    };
    const drawn = structuredClone(lastTable);
    drawn.hasDrawn = true;
    drawn.deck = [];
    drawn.players["bob"].encryptedCards = [{ card: [1], id: 1, ivArr: [0] }];
    expect(crazyEightsCheatDetection(drawn, lastTable)).toBeNull();
  });

  it("accepts several voluntary draws coalesced into one same-turn snapshot", () => {
    const lastTable: Table = {
      gameId: "crazy-eights",
      turn: 2,
      whoseTurn: "bob",
      playerOrder: ["alice", "bob"],
      deck: [
        { card: [1], id: 1, ivArr: [0] },
        { card: [2], id: 2, ivArr: [0] },
        { card: [3], id: 3, ivArr: [0] },
      ],
      pile: [new Card(1, 6)],
      hasDrawn: false,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 0 },
      players: {
        alice: {
          cards: [new Card(2, 4)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
        bob: {
          cards: [new Card(1, 3)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
      },
    };
    const drawn = structuredClone(lastTable);
    drawn.hasDrawn = true;
    drawn.deck = [{ card: [3], id: 3, ivArr: [0] }];
    drawn.players["bob"].encryptedCards = [
      { card: [1], id: 1, ivArr: [0] },
      { card: [2], id: 2, ivArr: [0] },
    ];
    expect(crazyEightsCheatDetection(drawn, lastTable)).toBeNull();
  });

  it("flags a same-turn draw that takes more from the deck than appear in hand", () => {
    const lastTable: Table = {
      gameId: "crazy-eights",
      turn: 2,
      whoseTurn: "bob",
      playerOrder: ["alice", "bob"],
      deck: [
        { card: [1], id: 1, ivArr: [0] },
        { card: [2], id: 2, ivArr: [0] },
      ],
      pile: [new Card(1, 6)],
      hasDrawn: false,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 0 },
      players: {
        alice: {
          cards: [new Card(2, 4)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
        bob: {
          cards: [new Card(1, 3)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
      },
    };
    const drawn = structuredClone(lastTable);
    drawn.hasDrawn = true;
    drawn.deck = [];
    drawn.players["bob"].encryptedCards = [{ card: [1], id: 1, ivArr: [0] }];
    expect(crazyEightsCheatDetection(drawn, lastTable)).toBe(
      CheatEnum.outOfOrderTurns,
    );
  });

  it("accepts drawing twice then playing when draw snapshots were skipped", () => {
    const lastTable: Table = {
      gameId: "crazy-eights",
      turn: 2,
      whoseTurn: "bob",
      playerOrder: ["alice", "bob"],
      deck: [
        { card: [1], id: 1, ivArr: [0] },
        { card: [2], id: 2, ivArr: [0] },
      ],
      pile: [new Card(1, 6)],
      hasDrawn: false,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 0 },
      players: {
        alice: {
          cards: [new Card(2, 4)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
        bob: {
          cards: [new Card(1, 3)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
      },
    };
    const played = structuredClone(lastTable);
    played.turn = 3;
    played.whoseTurn = "alice";
    played.hasDrawn = false;
    played.deck = [];
    played.pile = [...lastTable.pile, new Card(1, 5)];
    played.players["bob"].cards = [new Card(1, 3), new Card(2, 9)];
    expect(crazyEightsCheatDetection(played, lastTable)).toBeNull();
  });

  it("accepts playing a card after a recorded draw snapshot", () => {
    const afterDraw: Table = {
      gameId: "crazy-eights",
      turn: 2,
      whoseTurn: "bob",
      playerOrder: ["alice", "bob"],
      deck: [],
      pile: [new Card(1, 6)],
      hasDrawn: true,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 0 },
      players: {
        alice: {
          cards: [new Card(2, 4)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
        bob: {
          cards: [new Card(1, 3), new Card(1, 5)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
      },
    };
    const played = structuredClone(afterDraw);
    played.turn = 3;
    played.whoseTurn = "alice";
    played.hasDrawn = false;
    played.pile = [...afterDraw.pile, new Card(1, 5)];
    played.players["bob"].cards = [new Card(1, 3)];
    expect(crazyEightsCheatDetection(played, afterDraw)).toBeNull();
  });

  it("accepts drawing and playing that card on the same turn", () => {
    const lastTable: Table = {
      gameId: "crazy-eights",
      turn: 2,
      whoseTurn: "bob",
      playerOrder: ["alice", "bob"],
      deck: [{ card: [1], id: 1, ivArr: [0] }],
      pile: [new Card(1, 6)],
      hasDrawn: false,
      crazyEights: { currentSuit: "♠", direction: 1, pendingDraw: 0 },
      players: {
        alice: {
          cards: [new Card(2, 4)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
        bob: {
          cards: [new Card(1, 3)],
          encryptedCards: [],
          sets: [],
          connected: true,
        },
      },
    };
    const table = structuredClone(lastTable);
    table.turn = 3;
    table.whoseTurn = "alice";
    table.hasDrawn = false;
    table.deck = [];
    table.pile = [...lastTable.pile, new Card(1, 5)];
    expect(crazyEightsCheatDetection(table, lastTable)).toBeNull();
  });

  it("accepts a winning last 8 that does not apply the declared suit", () => {
    const { lastTable, table } = basePair();
    const eight = new Card(4, 8);
    lastTable.players["alice"].cards = [eight];
    lastTable.players["alice"].encryptedCards = [];
    table.turn = 2;
    table.whoseTurn = "alice";
    table.pile = [...lastTable.pile, eight];
    table.players["alice"].cards = [];
    table.crazyEights = { currentSuit: "♠", direction: 1, pendingDraw: 0 };
    expect(crazyEightsCheatDetection(table, lastTable)).toBeNull();
  });

  it("accepts a winning last 8 even when turn is not incremented", () => {
    const { lastTable, table } = basePair();
    const eight = new Card(4, 8);
    lastTable.players["alice"].cards = [eight];
    lastTable.players["alice"].encryptedCards = [];
    table.turn = lastTable.turn;
    table.whoseTurn = "alice";
    table.pile = [...lastTable.pile, eight];
    table.players["alice"].cards = [];
    table.crazyEights = { currentSuit: "♠", direction: 1, pendingDraw: 0 };
    expect(crazyEightsCheatDetection(table, lastTable)).toBeNull();
  });

  it("flags a decrypted play of a card that was not in the actor's hand", () => {
    const { lastTable, table } = basePair();
    table.whoseTurn = "bob";
    table.pile = [...lastTable.pile, new Card(1, 12)];
    table.players["alice"].cards = [new Card(2, 4)];
    lastTable.players["alice"].cards = [new Card(2, 4)];
    expect(crazyEightsCheatDetection(table, lastTable)).toBe(
      CheatEnum.illegalCardPlayed,
    );
  });
});
