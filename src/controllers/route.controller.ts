import { ReactiveControllerHost, noChange, html } from "lit";
import {
  ChildPart,
  DirectiveParameters,
  directive,
  DirectiveResult,
} from "lit/directive.js";
import { AsyncDirective } from "lit/async-directive.js";
import { Route } from "../models/route";
import { routerService } from "../services/router.service";
import { user } from "../services/user.service";
import { UserController } from "./user.controller";

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
    return html` <div class="loader">
      <svg
        version="1.1"
        id="loader-1"
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        x="0px"
        y="0px"
        width="100px"
        height="100px"
        viewBox="0 0 50 50"
        style="enable-background:new 0 0 50 50;"
        xml:space="preserve"
      >
        <path
          fill="#000"
          d="M25.251,6.461c-10.318,0-18.683,8.365-18.683,18.683h4.068c0-8.071,6.543-14.615,14.615-14.615V6.461z"
        >
          <animateTransform
            attributeType="xml"
            attributeName="transform"
            type="rotate"
            from="0 25 25"
            to="360 25 25"
            dur="0.6s"
            repeatCount="indefinite"
          ></animateTransform>
        </path>
      </svg>
    </div>`;
  }
}
const routeDirective = directive(RouteDirective);

export class RouteController {
  private host: ReactiveControllerHost;
  private user: UserController;
  canceled = false;

  routes: Route[] = [
    {
      name: "home",
      pattern: "",
      component: () =>
        import("../components/lobby/lobby").then(
          () => html`<card-lobby></card-lobby>`
        ),
    },
    {
      name: "lobby",
      pattern: "lobby",
      component: () =>
        import("../components/lobby/lobby").then(
          () => html`<card-lobby></card-lobby>`
        ),
    },
    {
      name: "rummy",
      pattern: "rummy",
      component: () =>
        import("../components/rummy/rummy").then(
          () => html`<card-rummy></card-rummy>`
        ),
      isProtected: true,
    },
    {
      name: "about",
      pattern: "about",
      component: () =>
        import("../components/about/about").then(
          () => html`<app-about></app-about>`
        ),
    },
    {
      name: "not-found",
      pattern: "*",
      component: () =>
        import("../components/404/404").then(
          () => html`<not-found></not-found>`
        ),
    },
  ];

  activeRoute: Route = this.routes[0];

  navigation(): DirectiveResult<typeof RouteDirective> {
    return routeDirective(this.activeRoute);
  }

  _changeRoute = (e: CustomEvent) => {
    this.canceled = true;
    const uri = decodeURI(window.location.pathname);
    let nextRoute = this.routes.find(
      (route) =>
        route.pattern !== "*" && routerService.testRoute(uri, route.pattern)
    );
    if (nextRoute) {
      if (nextRoute.name !== this.activeRoute.name) {
        if (nextRoute.isProtected && !this.user.value) {
          this.canceled = false;
          const loginRoute = this.routes.filter(
            (route) => route.pattern === "lobby"
          )[0];
          if ((user as any).is) {
            user.get("alias").on((v) => {
              if (!this.canceled) {
                this.activeRoute = nextRoute!;
                this.host.requestUpdate();
              }
            });
          } else {
            this.activeRoute = loginRoute;
            window.history.pushState({}, "", loginRoute.name);
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
    host.addController(this);
  }

  hostConnected(): void {
    window.addEventListener("route-update", this._changeRoute as EventListener);
  }

  hostDisconnected(): void {
    window.removeEventListener(
      "route-update",
      this._changeRoute as EventListener
    );
  }
}
