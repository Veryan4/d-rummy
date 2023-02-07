import { html } from "lit";
import { userService } from "./services";
import { Route } from "@veryan/lit-spa";


export function authGuard() {
  return new Promise(()=> userService.getUser()).then((user) => user ? true : "")
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
        import("./pages/rummy/rummy").then(
          () => html`<card-rummy></card-rummy>`
        ),
      guard: authGuard,
    },
    {
      name: "about",
      pattern: "about",
      component: () =>
        import("./pages/about/about").then(
          () => html`<app-about></app-about>`
        ),
    },
    {
      name: "not-found",
      pattern: "*",
      component: () =>
        import("./pages/404/404").then(() => html`<not-found></not-found>`),
    },
  ];
