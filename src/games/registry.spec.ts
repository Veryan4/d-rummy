import { getGame, isGameId, listGames } from "./registry";

describe("game registry", () => {
  it("lists crazy eights then rummy", () => {
    expect(listGames().map((g) => g.id)).toEqual(["crazy-eights", "rummy"]);
  });

  it("resolves unknown ids to rummy for legacy tables", () => {
    expect(getGame(undefined).id).toBe("rummy");
    expect(getGame(null).id).toBe("rummy");
    expect(getGame("not-a-game").id).toBe("rummy");
  });

  it("resolves crazy-eights", () => {
    expect(getGame("crazy-eights").route).toBe("crazy-eights");
    expect(getGame("crazy-eights").peerNamespace).toBe("crazy-eights");
    expect(getGame("crazy-eights").maxPlayers).toBe(5);
  });

  it("keeps rummy peer namespace unchanged", () => {
    expect(getGame("rummy").peerNamespace).toBe("rummy");
    expect(getGame("rummy").route).toBe("rummy");
  });

  it("type-guards game ids", () => {
    expect(isGameId("rummy")).toBe(true);
    expect(isGameId("crazy-eights")).toBe(true);
    expect(isGameId("poker")).toBe(false);
  });
});
