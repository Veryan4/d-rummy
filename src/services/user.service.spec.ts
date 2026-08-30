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
      return this.value !== undefined ? structuredClone(this.value) : (this.value as any);
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

import { userService } from "./user.service";

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
});
