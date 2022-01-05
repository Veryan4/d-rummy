import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { initTranslateLanguage } from "./services/translate.service";
import { RouteController } from "./controllers/route.controller";
import "./components/top-bar/top-bar";
import { topAppBarStyles } from "./styles/top-app-bar.styles.min";

@customElement("my-app")
class Truba extends LitElement {
  static styles = [
    topAppBarStyles,
    css`
      .main {
        padding: 1rem;
        display: flex;
        justify-content: center;
      }
    `,
  ];

  private router = new RouteController(this);

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
      </main>
    `;
  }

  renderLoader() {
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
