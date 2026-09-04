// Mock @veryan/lit-spa to prevent importing full Lit DOM/router components in Node
jest.mock("@veryan/lit-spa", () => {
  class State<T> {
    protected value: T;
    protected listeners: Map<number, (e: T) => any> = new Map();
    protected oneTimeListeners: ((e: T) => any)[] = [];
    protected isEqual: (a: T, b: T) => boolean;

    constructor(isEqual?: (a: T, b: T) => boolean) {
      this.isEqual = isEqual || ((a, b) => a === b);
    }

    getValue(): T {
      return this.value !== undefined
        ? structuredClone(this.value)
        : (this.value as any);
    }

    subscribe(fn: (e: T) => any): () => boolean {
      const id = Date.now() + Math.random();
      this.listeners.set(id, fn);
      if (this.value !== undefined) {
        fn(this.getValue());
      }
      return () => this.listeners.delete(id);
    }

    subscribeOnce(fn: (e: T) => any): void {
      this.oneTimeListeners.push(fn);
    }

    emit(): void {
      this.listeners.forEach((fn) => fn(this.getValue()));
      this.oneTimeListeners.forEach((fn) => fn(this.getValue()));
      this.oneTimeListeners = [];
    }

    update(value: T): void {
      if (!this.isEqual(this.value, value)) {
        this.value = value;
        this.emit();
      }
    }
  }

  return { State };
});

import {
  userService,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "./user.service";

describe("userService", () => {
  beforeEach(() => {
    sessionStorage.clear();
    userService.setUser(null);
  });

  describe("getUser", () => {
    it("should return null when no user is set", () => {
      expect(userService.getUser()).toBeNull();
    });

    it("should return username when stored in sessionStorage", () => {
      sessionStorage.setItem("username", "alice");
      expect(userService.getUser()).toBe("alice");
    });
  });

  describe("setUser", () => {
    it("should store username in sessionStorage and update reactive state", () => {
      const stateListener = jest.fn();
      const unsubscribe = userService.state.subscribe(stateListener);

      userService.setUser("bob");

      expect(userService.getUser()).toBe("bob");
      expect(sessionStorage.getItem("username")).toBe("bob");
      expect(userService.state.getValue()).toBe("bob");
      expect(stateListener).toHaveBeenCalledWith("bob");

      unsubscribe();
    });

    it("should remove username from sessionStorage and update state to null when passed null", () => {
      userService.setUser("bob");
      expect(userService.getUser()).toBe("bob");

      const stateListener = jest.fn();
      const unsubscribe = userService.state.subscribe(stateListener);

      userService.setUser(null);

      expect(userService.getUser()).toBeNull();
      expect(sessionStorage.getItem("username")).toBeNull();
      expect(userService.state.getValue()).toBeNull();
      expect(stateListener).toHaveBeenCalledWith(null);

      unsubscribe();
    });
  });

  describe("removeUser", () => {
    it("should remove username and reset state to null", () => {
      userService.setUser("charlie");
      expect(userService.getUser()).toBe("charlie");

      const stateListener = jest.fn();
      const unsubscribe = userService.state.subscribe(stateListener);

      userService.removeUser();

      expect(userService.getUser()).toBeNull();
      expect(sessionStorage.getItem("username")).toBeNull();
      expect(userService.state.getValue()).toBeNull();
      expect(stateListener).toHaveBeenCalledWith(null);

      unsubscribe();
    });
  });

  describe("filterUsernameInput", () => {
    it("should strip non-alphanumeric characters", () => {
      expect(userService.filterUsernameInput("Al!ice<script>")).toBe(
        "Alicescript",
      );
      expect(userService.filterUsernameInput("bob_doe-42")).toBe("bobdoe42");
      expect(userService.filterUsernameInput("  spaced  name  ")).toBe(
        "spacedname",
      );
    });

    it("should truncate input to the max length", () => {
      const tooLong = "a".repeat(USERNAME_MAX_LENGTH + 8);
      expect(userService.filterUsernameInput(tooLong)).toBe(
        "a".repeat(USERNAME_MAX_LENGTH),
      );
    });
  });

  describe("sanitizeUsername", () => {
    it("should filter, truncate, and apply capitalization formatting", () => {
      expect(userService.sanitizeUsername("aLICE")).toBe("Alice");
      expect(userService.sanitizeUsername("  bob!!  ")).toBe("Bob");
      expect(userService.sanitizeUsername("x".repeat(20))).toBe(
        "X" + "x".repeat(USERNAME_MAX_LENGTH - 1),
      );
    });

    it("should return an empty string when nothing valid remains", () => {
      expect(userService.sanitizeUsername("!!!")).toBe("");
      expect(userService.sanitizeUsername("   ")).toBe("");
    });
  });

  describe("isValidUsername", () => {
    it("should accept alphanumeric names within the length limit", () => {
      expect(userService.isValidUsername("Al")).toBe(true);
      expect(userService.isValidUsername("Alice")).toBe(true);
      expect(userService.isValidUsername("Player1")).toBe(true);
      expect(userService.isValidUsername("a".repeat(USERNAME_MAX_LENGTH))).toBe(
        true,
      );
    });

    it("should reject names that are too short, too long, or have invalid characters", () => {
      expect(userService.isValidUsername("")).toBe(false);
      expect(
        userService.isValidUsername("a".repeat(USERNAME_MIN_LENGTH - 1)),
      ).toBe(false);
      expect(
        userService.isValidUsername("a".repeat(USERNAME_MAX_LENGTH + 1)),
      ).toBe(false);
      expect(userService.isValidUsername("Alice!")).toBe(false);
      expect(userService.isValidUsername("bob-doe")).toBe(false);
      expect(userService.isValidUsername("Ann Marie")).toBe(false);
    });
  });

  describe("createUserId", () => {
    const uuid = "11111111-1111-4111-8111-111111111111";

    beforeEach(() => {
      jest.spyOn(crypto, "randomUUID").mockReturnValue(uuid);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should return a capitalized name with a UUID suffix", () => {
      expect(userService.createUserId("alice!")).toBe(`Alice-${uuid}`);
    });

    it("should return null for names that are invalid after sanitization", () => {
      expect(userService.createUserId("!")).toBeNull();
      expect(userService.createUserId("a")).toBeNull();
    });
  });
});
