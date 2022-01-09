import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { initTranslateLanguage } from "./services/translate.service";
import { RouteController } from "./controllers/route.controller";
import { ToastController } from "./controllers/toast.controller";
import { topAppBarStyles } from "./styles/top-app-bar.styles";
import { toastStyles } from "./styles/toast.styles";
import "./components/top-bar/top-bar";


@customElement("my-app")
class Truba extends LitElement {
  static styles = [
    topAppBarStyles,
    toastStyles,
    css`
      .main {
        padding: 1rem;
        display: flex;
        justify-content: center;
      }
    `,
  ];

  private router = new RouteController(this);
  private toaster = new ToastController(this);

  @property({ type: Boolean })
  hasLoadedTranslations: boolean;

  constructor() {
    super();
  }

  render() {
    return html`
      <top-bar></top-bar>
      <main class="mdc-top-app-bar--fixed-adjust">
        <div class="main">${this.router.navigation()}</div>
        ${this.toaster.wait()}
      </main>
    `;
  }

  shouldUpdate(
    changedProperties: Map<string | number | symbol, unknown>
  ): boolean {
    return this.hasLoadedTranslations && super.shouldUpdate(changedProperties);
  }

  async connectedCallback() {
    super.connectedCallback();

    window.dispatchEvent(new CustomEvent("route-update"));
    window.onpopstate = () => {
      window.dispatchEvent(new CustomEvent("route-update"));
    };

    !this.hasLoadedTranslations && (await initTranslateLanguage());
    this.hasLoadedTranslations = true;
  }
}
