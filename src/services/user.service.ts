import { State } from "@veryan/lit-spa";

const USER_KEY = "username";

export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 16;
export const USERNAME_PATTERN = "[A-Za-z0-9]+";

const USERNAME_DISALLOWED = /[^A-Za-z0-9]/g;
const USERNAME_VALID = new RegExp(`^${USERNAME_PATTERN}$`);

const state = new State<string | null>();

export const userService = {
  getUser,
  setUser,
  removeUser,
  filterUsernameInput,
  sanitizeUsername,
  isValidUsername,
  createUserId,
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

function filterUsernameInput(raw: string): string {
  return raw.replace(USERNAME_DISALLOWED, "").slice(0, USERNAME_MAX_LENGTH);
}

function sanitizeUsername(raw: string): string {
  const filtered = filterUsernameInput(raw.trim());
  if (!filtered) {
    return "";
  }
  return filtered.charAt(0).toUpperCase() + filtered.slice(1).toLowerCase();
}

function isValidUsername(name: string): boolean {
  return (
    name.length >= USERNAME_MIN_LENGTH &&
    name.length <= USERNAME_MAX_LENGTH &&
    USERNAME_VALID.test(name)
  );
}

function createUserId(rawName: string): string | null {
  const name = sanitizeUsername(rawName);
  if (!isValidUsername(name)) {
    return null;
  }
  return `${name}-${crypto.randomUUID()}`;
}
