import { ReactiveControllerHost, noChange, html } from "lit";
import {
  ChildPart,
  DirectiveParameters,
  directive,
  DirectiveResult,
} from "lit/directive.js";
import { AsyncDirective } from "lit/async-directive.js";
import { Route } from "../models";
import { routerService, userService } from "../services";
import { UserController } from "./user.controller";
import "../components/loader/loader";

class RouteDirective extends AsyncDirective {
  private currentRoute: string;

  update(part: ChildPart, [route]: DirectiveParameters<this>) {
    // target element can be accessed from part
    return this.render(route);
  }

  render(route: Route) {
    if (this.currentRoute === route.name) {
      return noChange;
    }
    this.currentRoute = route.name;
    route.component().then((resolvedValue) => {
      // Rendered asynchronously:
      this.setValue(resolvedValue);
    });
    return html`<app-loader></app-loader>`;
  }
}
const routeDirective = directive(RouteDirective);

export class RouteController {
  private host: ReactiveControllerHost;
  private user: UserController;

  routes: Route[] = [
    {
      name: "home",
      pattern: "",
      component: () =>
        import("../pages/home/home").then(
          () => html`<card-home></card-home>`
        ),
    },
    {
      name: "private",
      pattern: "private",
      component: () =>
        import("../pages/private-lobby/private-lobby").then(
          () => html`<private-lobby></private-lobby>`
        ),
      isProtected: true
    },
    {
      name: "public",
      pattern: "public",
      component: () =>
        import("../pages/public-lobby/public-lobby").then(
          () => html`<public-lobby></public-lobby>`
        ),
      isProtected: true
    },
    {
      name: "rummy",
      pattern: "rummy",
      component: () =>
        import("../pages/rummy/rummy").then(
          () => html`<card-rummy></card-rummy>`
        ),
      isProtected: true,
    },
    {
      name: "about",
      pattern: "about",
      component: () =>
        import("../pages/about/about").then(
          () => html`<app-about></app-about>`
        ),
    },
    {
      name: "not-found",
      pattern: "*",
      component: () =>
        import("../pages/404/404").then(
          () => html`<not-found></not-found>`
        ),
    },
  ];

  activeRoute: Route = this.routes[0];

  navigation(): DirectiveResult<typeof RouteDirective> {
    return routeDirective(this.activeRoute);
  }

  _changeRoute = (e: CustomEvent) => {
    const uri = decodeURI(window.location.pathname);
    let nextRoute = this.routes.find(
      (route) =>
        route.pattern !== "*" && routerService.testRoute(uri, route.pattern)
    );
    if (nextRoute) {
      if (nextRoute.name !== this.activeRoute.name) {
        if (nextRoute.isProtected && !this.user.value) {
          const loginRoute = this.routes.filter(
            (route) => route.pattern === ""
          )[0];
          if (userService.getUser()) {
            this.activeRoute = nextRoute!;
            this.host.requestUpdate();
          } else {
            this.activeRoute = loginRoute;
            window.history.pushState({}, "", loginRoute.pattern);
            this.host.requestUpdate();
          }
        } else {
          this.activeRoute = nextRoute;
          this.host.requestUpdate();
        }
      }
    } else {
      nextRoute = this.routes.find((route) => route.pattern === "*");
      if (nextRoute) {
        this.activeRoute = nextRoute;
        this.host.requestUpdate();
      }
    }
  };

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    this.user = new UserController(host);
    const homeRoute = this.routes.find((route) => route.pattern === "");
    if (homeRoute) {
      this.activeRoute = homeRoute;
    }

    const urlSearchParams = new URLSearchParams(location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    if (params && params.game) {
      sessionStorage.setItem("game", params.game)
    }

    host.addController(this);
  }

  hostConnected(): void {
    window.addEventListener(routerService.ROUTE_EVENT, this._changeRoute as EventListener);
  }

  hostDisconnected(): void {
    window.removeEventListener(
      routerService.ROUTE_EVENT,
      this._changeRoute as EventListener
    );
  }
}
