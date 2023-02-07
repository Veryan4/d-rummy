import { LitElement, html } from "lit";
import { customElement, query } from "lit/decorators.js";
import {
  UserController,
} from "../../controllers";
import {
  userService,
} from "../../services";
import { 
  SoundController,
  TranslationController,
  DeviceController,
  ThemeController,
  themeService,
  translateService,
  routerService,
  soundService
} from "@veryan/lit-spa";
import { topAppBarStyles, iconButtonStyles, menuStyles } from "../../styles";
import { styles } from "./top-bar.styles";

import "@material/mwc-menu";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-switch";
import "@material/mwc-formfield";

@customElement("top-bar")
class TopBar extends LitElement {
  static styles = [topAppBarStyles, iconButtonStyles, menuStyles, styles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);
  private device = new DeviceController(this);
  private sound = new SoundController(this);
  private theme = new ThemeController(this);

  @query("#anchor")
  anchor: HTMLElement;

  @query("#menu")
  menu: any;

  render() {
    return html` <header class="mdc-top-app-bar top-bar">
        <div class="mdc-top-app-bar__row">
          <section
            class="mdc-top-app-bar__section mdc-top-app-bar__section--align-start"
          >
            <a href="/" class="logo"></a>
          </section>
          <section
            class="mdc-top-app-bar__section mdc-top-app-bar__section--align-end"
            role="toolbar"
          >
            <div style="position: relative;">
              <div
                style="cursor:pointer"
                @click=${() => (this.menu.open = true)}
              >
                ${this.i18n.t("header.menu")}
                <button
                  id="anchor"
                  aria-label="Options"
                  class="material-icons mdc-top-app-bar__action-item mdc-icon-button hamburger toolbar mdc-menu-surface--anchor"
                >
                  view_headline
                </button>
              </div>
              ${this.renderMenu()}
            </div>
          </section>
        </div>
      </header>
      <main class="mdc-top-app-bar--fixed-adjust">
        <slot></slot>
      </main>`;
  }

  renderMenu() {
    return html`
      <mwc-menu
        id="menu"
        .anchor=${this.anchor}
        .corner=${this.device.isMobile ? "TOP_RIGHT" : "TOP_LEFT"}
        .menuCorner=${this.device.isMobile ? "END" : "START"}
      >
        <mwc-list-item @click=${() => routerService.navigate("about")}>
          <i class="material-icons mdc-icon-button__icon">info</i>
          ${this.i18n.t("header.about")}
        </mwc-list-item>
        <mwc-list-item @click=${this.changeTheme}>
          <i class="material-icons mdc-icon-button__icon">invert_colors</i>
          ${this.i18n.t("header.dark_mode")}
        </mwc-list-item>
        <mwc-list-item @click=${soundService.toggleSound}>
          <i class="material-icons mdc-icon-button__icon"
            >${this.sound.value
              ? "notifications_active"
              : "notifications_none"}</i
          >
          ${this.sound.value
            ? html`${this.i18n.t("header.sound_on")}`
            : html`${this.i18n.t("header.sound_off")}`}
        </mwc-list-item>
        ${this.user.value
          ? html`<mwc-list-item @click=${this.logout}
              ><i class="material-icons mdc-icon-button__icon">clear</i
              >${this.i18n.t("header.logout")}</mwc-list-item
            >`
          : ""}
        <hr />
        <mwc-list-item @click=${() => this.language("en")}>
          <i class="material-icons mdc-icon-button__icon flag uk-flag"></i>
          English
        </mwc-list-item>
        <mwc-list-item @click=${() => this.language("fr")}>
          <i class="material-icons mdc-icon-button__icon flag fr-flag"></i>
          Francais
        </mwc-list-item>
      </mwc-menu>
    `;
  }

  async logout(): Promise<void> {
    this.user.value = null;
    await userService.removeUser();
  }

  language(lang: string): void {
    translateService.useLanguage(lang);
  }

  changeTheme() {
    if (this.theme.value == "light") {
      themeService.changeTheme("dark");
    } else {
      themeService.changeTheme("light")
    }
  }
}
