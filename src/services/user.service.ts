import { navigate } from "./router.service";
import GUN from "gun";
import "gun/sea";
import "gun/axe";

const password = "SamePasswordForEveryone";
const USER_KEY = "username";
const USER_EVENT = "user-update";

export const userService = {
  getUser,
  signUpAndLogin,
  signOut,
  USER_EVENT
};

export const db = GUN(["https://d-rummy-gun.herokuapp.com/gun"]);
export const user = db.user().recall({ sessionStorage: true });

user.get("alias").on((v) => setUser(v));
// @ts-ignore
db.on("auth", async (event: Event) => {
  const alias = await user.get("alias").on((v) => setUser(v)); // username string

  console.log(`signed in as ${alias}`);
});

function signOut(): void {
  user.leave();
  setUser(null);
  navigate("login");
}

async function signUpAndLogin(username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    user.auth(username, password, ({ err }) => {
      if (err) {
        resolve(signup(username));
      }
    });
  });
}

async function signup(username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    user.create(username, password, async ({ err }) => {
      if (err) {
        alert(err);
        reject(err);
      } else {
        return resolve(login(username));
      }
    });
  });
}

async function login(username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    user.auth(username, password, ({ err }) => {
      if (err) {
        alert(err);
        reject(err);
      }
      resolve();
    });
  });
}

function getUser() {
  return sessionStorage.getItem(USER_KEY)
}

function setUser(nextUser: string | null) {
  if (nextUser) {
    sessionStorage.setItem(USER_KEY, nextUser)
  } else {
    sessionStorage.removeItem(USER_KEY)
  }
  window.dispatchEvent(
    new Event(USER_EVENT)
  );
}
