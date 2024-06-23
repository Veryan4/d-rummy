import { LitElement, html } from "lit";
import { customElement, query } from "lit/decorators.js";
import { UserController } from "../../controllers";
import { userService } from "../../services";
import {
  SoundController,
  TranslationController,
  DeviceController,
  ThemeController,
  themeService,
  translateService,
  routerService,
  soundService,
} from "@veryan/lit-spa";
import { topAppBarStyles, iconButtonStyles } from "../../styles";
import { styles } from "./top-bar.styles";

@customElement("top-bar")
class TopBar extends LitElement {
  static styles = [topAppBarStyles, iconButtonStyles, styles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);
  private device = new DeviceController(this);
  private sound = new SoundController(this);
  private theme = new ThemeController(this);


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
      <md-menu
        id="menu"
        anchor="anchor"
        .anchor-corner=${this.device.isMobile ? "TOP_RIGHT" : "TOP_LEFT"}
        .menu-corner=${this.device.isMobile ? "END" : "START"}
      >
        <md-menu-item @click=${() => routerService.navigate("about")}>
          <div class="menu-item" slot="headline">
            <i class="material-icons mdc-icon-button__icon">info</i>
            ${this.i18n.t("header.about")}
          </div>
        </md-menu-item>
        <md-menu-item @click=${this.changeTheme}>
          <div class="menu-item" slot="headline">
            <i class="material-icons mdc-icon-button__icon">invert_colors</i>
            ${this.i18n.t("header.dark_mode")}
          </div>
        </md-menu-item>
        <md-menu-item @click=${soundService.toggleSound}>
          <div class="menu-item" slot="headline">
            <i class="material-icons mdc-icon-button__icon"
              >${this.sound.value
                ? "notifications_active"
                : "notifications_none"}</i
            >
            ${this.sound.value
              ? html`${this.i18n.t("header.sound_on")}`
              : html`${this.i18n.t("header.sound_off")}`}
          </div>
        </md-menu-item>
        ${this.user.value
          ? html`<md-menu-item @click=${this.logout}>
              <div class="menu-item" slot="headline">
                <i class="material-icons mdc-icon-button__icon">clear</i
                >${this.i18n.t("header.logout")}
              </div>
            </md-menu-item>`
          : ""}
        <hr />
        <md-menu-item @click=${() => this.language("en")}>
          <div class="menu-item" slot="headline">
            <i class="material-icons mdc-icon-button__icon flag uk-flag"></i>
            English
          </div>
        </md-menu-item>
        <md-menu-item @click=${() => this.language("fr")}>
          <div class="menu-item" slot="headline">
            <i class="material-icons mdc-icon-button__icon flag fr-flag"></i>
            Francais
          </div>
        </md-menu-item>
      </md-menu>
    `;
  }

  logout() {
    this.user.value = null;
    sessionStorage.removeItem("game");
    sessionStorage.removeItem("players");
    sessionStorage.removeItem("table");
    sessionStorage.removeItem("hand");
    sessionStorage.removeItem("secretMap");
    sessionStorage.removeItem("decryptedMap");
    userService.removeUser();
    routerService.navigate("");
  }

  language(lang: string): void {
    translateService.useLanguage(lang);
  }

  changeTheme() {
    if (this.theme.value == "light") {
      themeService.changeTheme("dark");
    } else {
      themeService.changeTheme("light");
    }
  }
}
