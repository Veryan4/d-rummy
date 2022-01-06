import { userStore } from "./user.store";
import { navigate } from "./router.service";
import GUN from "gun";
import "gun/sea";
import "gun/axe";

export const userService = {
  user: () => userStore.getUser(),
  signUpAndLogin,
  signout,
  setUser,
};

const password = "SamePasswordForEveryone";

export const db = GUN(["https://d-rummy-gun.herokuapp.com/gun"]);
export const user = db.user().recall({ sessionStorage: true });

user.get("alias").on((v) => setUser(v));
// @ts-ignore
db.on("auth", async (event: Event) => {
  const alias = await user.get("alias").on((v) => setUser(v)); // username string

  console.log(`signed in as ${alias}`);
});

function signout(): void {
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

function setUser(newUser: string | null): string | null {
  userStore.setUser(newUser);
  window.dispatchEvent(new CustomEvent("user-update", { detail: newUser }));
  return newUser;
}