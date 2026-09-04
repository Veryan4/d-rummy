import { isDeckDealer, nextEncryptHop } from "./deck-protocol";

describe("deck protocol", () => {
  it("treats the first player as dealer", () => {
    expect(isDeckDealer("alice", ["alice", "bob"])).toBe(true);
    expect(isDeckDealer("bob", ["alice", "bob"])).toBe(false);
    expect(isDeckDealer("cara", ["alice", "bob", "cara"])).toBe(false);
  });

  it("sends the first player to the second in a two-player game", () => {
    expect(nextEncryptHop("alice", ["alice", "bob"])).toBe("bob");
    expect(nextEncryptHop("bob", ["alice", "bob"])).toBeNull();
  });

  it("walks three players and finalizes on the last", () => {
    const order = ["alice", "bob", "cara"];
    expect(nextEncryptHop("alice", order)).toBe("bob");
    expect(nextEncryptHop("bob", order)).toBe("cara");
    expect(nextEncryptHop("cara", order)).toBeNull();
  });

  it("returns null when the user is not in the order", () => {
    expect(nextEncryptHop("dave", ["alice", "bob"])).toBeNull();
  });
});
