import { State } from "@veryan/lit-spa";

const USER_KEY = "username";

const state = new State<string | null>();

export const userService = {
  getUser,
  setUser,
  removeUser,
  state,
};

function getUser(): string | null {
  return sessionStorage.getItem(USER_KEY);
}

function setUser(nextUser: string | null): void {
  if (nextUser) {
    sessionStorage.setItem(USER_KEY, nextUser);
  } else {
    sessionStorage.removeItem(USER_KEY);
  }
  state.update(nextUser);
}

function removeUser(): void {
  sessionStorage.removeItem(USER_KEY);
  state.update(null);
}
