const USER_KEY = "username";
const USER_EVENT = "user-update";

export const userService = {
  getUser,
  setUser,
  removeUser,
  USER_EVENT,
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
  window.dispatchEvent(new Event(USER_EVENT));
}

function removeUser(): void {
  sessionStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(USER_EVENT));
}
