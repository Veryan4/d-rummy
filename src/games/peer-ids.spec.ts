import {
  gamePeerId,
  lobbyPeerId,
  playerFromGamePeer,
  playerFromLobbyPeer,
  publicHostId,
  publicPeerId,
} from "./peer-ids";

describe("peer-ids", () => {
  it("keeps rummy suffixes identical to the previous hardcoded ids", () => {
    expect(gamePeerId("Alice-uuid", "rummy")).toBe("Alice-uuid-rummy-game");
    expect(lobbyPeerId("Alice-uuid", "rummy")).toBe("Alice-uuid-rummy-lobby");
    expect(publicHostId("rummy")).toBe("public-rummy-host");
    expect(publicPeerId("Alice-uuid", "rummy")).toBe("public-rummy-Alice-uuid");
  });

  it("namespaces crazy eights separately", () => {
    expect(gamePeerId("Alice-uuid", "crazy-eights")).toBe(
      "Alice-uuid-crazy-eights-game",
    );
    expect(publicHostId("crazy-eights")).toBe("public-crazy-eights-host");
  });

  it("strips the suffix back to the user id", () => {
    expect(playerFromGamePeer("Alice-uuid-rummy-game", "rummy")).toBe(
      "Alice-uuid",
    );
    expect(
      playerFromLobbyPeer("Alice-uuid-crazy-eights-lobby", "crazy-eights"),
    ).toBe("Alice-uuid");
  });
});
