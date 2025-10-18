import { LitElement, html, css, PropertyValueMap } from "lit";
import { customElement } from "lit/decorators.js";
import {
  RouteController,
  TranslationController,
  themeService,
} from "@veryan/lit-spa";
import { routes } from "./app.routes";
import "./components/top-bar/top-bar";
import "@veryan/lit-spa";

@customElement("my-app")
class Truba extends LitElement {
  static styles = [
    css`
      .main {
        padding: 1rem 10rem;
        display: flex;
        justify-content: center;
      }
      @media only screen and (max-width: 752px) {
        .main {
          padding: 1rem;
        }
      }
    `,
  ];

  private router = new RouteController(this, routes);
  private i18n = new TranslationController(this, {
    supportedLanguages: ["en", "fr"],
  });

  render() {
    return html`
      <top-bar>
        <div class="main">${this.router.navigation()}</div>
        <lit-spa-toast></lit-spa-toast>
      </top-bar>
    `;
  }

  protected shouldUpdate(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): boolean {
    return this.i18n.hasLoadedTranslations;
  }

  async connectedCallback() {
    super.connectedCallback();
    this.registerThemes();
    const urlSearchParams = new URLSearchParams(location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    if (params && params.game) {
      sessionStorage.setItem("game", params.game);
    }
  }

  registerThemes() {
    const primaryWhite = "#fafafa";
    const secondaryWhite = "white";
    const primaryBlack = "#2c2c2c";
    const secondaryBlack = "black";
    const imageColor = "unset";
    const invertedImageColor = "invert(100%)";
    const inputBackgroundColor = "#E8E8E8";
    const invertedInputBackgroundColor = "#696969";
    const outlineColor = "#b0bec5";
    const invertedOutlineColor = "#2c2c2c";
    const toastBackground = "#313131";
    const chipBackground = "#696969";
    themeService.registerThemes({
      light: {
        "--primary-color": primaryBlack,
        "--primary-background-color": primaryWhite,
        "--secondary-background-color": secondaryWhite,
        "--image-color": imageColor,
        "--input-fill": inputBackgroundColor,
        "--outline-color": outlineColor,
        "--toast-background": toastBackground,
        "--chip-background": inputBackgroundColor,
      },
      dark: {
        "--primary-color": primaryWhite,
        "--primary-background-color": primaryBlack,
        "--secondary-background-color": secondaryBlack,
        "--image-color": invertedImageColor,
        "--input-fill": invertedInputBackgroundColor,
        "--outline-color": invertedOutlineColor,
        "--toast-background": secondaryBlack,
        "--chip-background": chipBackground,
      },
    } as any);
  }
}
