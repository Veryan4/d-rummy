import { html } from "lit";
import { userService } from "./services";
import { Route } from "@veryan/lit-spa";

export function authGuard() {
  if (userService.getUser()) {
    return Promise.resolve(true);
  }
  return Promise.reject("");
}

export const routes: Route[] = [
  {
    name: "home",
    pattern: "",
    component: () =>
      import("./pages/home/home").then(() => html`<card-home></card-home>`),
  },
  {
    name: "private",
    pattern: "private",
    component: () =>
      import("./pages/private-lobby/private-lobby").then(
        () => html`<private-lobby></private-lobby>`
      ),
    guard: authGuard,
  },
  {
    name: "public",
    pattern: "public",
    component: () =>
      import("./pages/public-lobby/public-lobby").then(
        () => html`<public-lobby></public-lobby>`
      ),
    guard: authGuard,
  },
  {
    name: "rummy",
    pattern: "rummy",
    component: () =>
      import("./pages/rummy/rummy").then(() => html`<card-rummy></card-rummy>`),
    guard: authGuard,
  },
  {
    name: "audit",
    pattern: "audit",
    component: () =>
      import("./pages/audit/audit").then(() => html`<card-audit></card-audit>`),
  },
  {
    name: "about",
    pattern: "about",
    component: () =>
      import("./pages/about/about").then(() => html`<app-about></app-about>`),
  },
  {
    name: "not-found",
    pattern: "*",
    component: () =>
      import("./pages/404/404").then(() => html`<not-found></not-found>`),
  },
];
