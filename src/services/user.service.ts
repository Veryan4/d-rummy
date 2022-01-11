import { routerService } from "./router.service";
import { gunService } from "./gun.service";

const password = "SamePasswordForEveryone";
const USER_KEY = "username";
const USER_EVENT = "user-update";

export const userService = {
  getUser,
  signUpAndLogin,
  signOut,
  USER_EVENT
};


gunService.user.get("alias").on((v) => setUser(v));
// @ts-ignore
gunService.db.on("auth", async (event: Event) => {
  const alias = await gunService.user.get("alias").on((v) => setUser(v)); // username string

  console.log(`signed in as ${alias}`);
});

function signOut(): void {
  gunService.user.leave();
  setUser(null);
  routerService.navigate("login");
}

async function signUpAndLogin(username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    gunService.user.auth(username, password, ({ err }) => {
      if (err) {
        resolve(signup(username));
      }
    });
  });
}

async function signup(username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    gunService.user.create(username, password, async ({ err }) => {
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
    gunService.user.auth(username, password, ({ err }) => {
      if (err) {
        alert(err);
        reject(err);
      }
      resolve();
    });
  });
}

function getUser(): string |  null {
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
