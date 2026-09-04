import { LitElement, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { UserController } from "../../controllers";
import { storeService, userService } from "../../services";
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
import {
  topAppBarStyles,
  menuIcon,
  cardsIcon,
  infoIcon,
  invertColorsIcon,
  notificationsOnIcon,
  notificationsOffIcon,
  closeIcon,
} from "../../styles";
import { styles } from "./top-bar.styles";
import "../../material-web";
import "../../pages/about/about";

@customElement("top-bar")
class TopBar extends LitElement {
  static styles = [topAppBarStyles, styles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);
  private device = new DeviceController(this);
  private sound = new SoundController(this);
  private theme = new ThemeController(this);

  @query("#menu")
  menu: any;

  @state()
  private helpOpen = false;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.onKeydown);
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this.onKeydown);
    document.body.style.overflow = "";
    super.disconnectedCallback();
  }

  render() {
    return html` <header class="mdc-top-app-bar top-bar">
        <div class="mdc-top-app-bar__row">
          <section
            class="mdc-top-app-bar__section mdc-top-app-bar__section--align-start"
          >
            <a href="/" class="logo" @click=${this.goHome}
              >${cardsIcon()} ${this.i18n.t("header.brand")}</a
            >
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
                <div
                  id="anchor"
                  aria-label="Options"
                  class="icon mdc-top-app-bar__action-item hamburger toolbar mdc-menu-surface--anchor"
                >
                  ${menuIcon()}
                </div>
              </div>
              ${this.renderMenu()}
            </div>
          </section>
        </div>
      </header>
      <main class="mdc-top-app-bar--fixed-adjust">
        <slot></slot>
      </main>
      ${this.renderHelpOverlay()}`;
  }

  renderMenu() {
    return html`
      <md-menu
        id="menu"
        anchor="anchor"
        .anchor-corner=${this.device.isMobile ? "TOP_RIGHT" : "TOP_LEFT"}
        .menu-corner=${this.device.isMobile ? "END" : "START"}
      >
        <md-menu-item @click=${this.openHelp}>
          <div class="menu-item" slot="headline">
            <i class="icon">${infoIcon()}</i>
            ${this.i18n.t("header.about")}
          </div>
        </md-menu-item>
        <md-menu-item @click=${this.changeTheme}>
          <div class="menu-item" slot="headline">
            <i class="icon">${invertColorsIcon()}</i>
            ${this.i18n.t("header.dark_mode")}
          </div>
        </md-menu-item>
        <md-menu-item @click=${soundService.toggleSound}>
          <div class="menu-item" slot="headline">
            <i class="icon"
              >${this.sound.value
                ? notificationsOnIcon()
                : notificationsOffIcon()}</i
            >
            ${this.sound.value
              ? html`${this.i18n.t("header.sound_on")}`
              : html`${this.i18n.t("header.sound_off")}`}
          </div>
        </md-menu-item>
        ${this.user.value
          ? html`<md-menu-item @click=${this.logout}>
              <div class="menu-item" slot="headline">
                <i class="icon">${closeIcon()}</i>${this.i18n.t(
                  "header.logout",
                )}
              </div>
            </md-menu-item>`
          : ""}
        <hr />
        <md-menu-item @click=${() => this.language("en")}>
          <div class="menu-item" slot="headline">
            <i class="icon flag uk-flag"></i>
            English
          </div>
        </md-menu-item>
        <md-menu-item @click=${() => this.language("fr")}>
          <div class="menu-item" slot="headline">
            <i class="icon flag fr-flag"></i>
            Francais
          </div>
        </md-menu-item>
      </md-menu>
    `;
  }

  renderHelpOverlay() {
    if (!this.helpOpen) {
      return "";
    }
    return html`
      <div class="help-backdrop" @click=${this.closeHelp}></div>
      <aside
        class="help-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
      >
        <div class="help-panel-header">
          <span id="help-title">${this.i18n.t("header.about")}</span>
          <button
            class="help-close"
            type="button"
            aria-label=${this.i18n.t("header.close")}
            @click=${this.closeHelp}
          >
            ${closeIcon()}
          </button>
        </div>
        <div class="help-panel-body">
          <app-about compact></app-about>
        </div>
      </aside>
    `;
  }

  private isPlaying(): boolean {
    const path = window.location.pathname.replace(/^\//, "");
    return (
      path === "rummy" ||
      path === "crazy-eights" ||
      !!storeService.getGameState().table
    );
  }

  private onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && this.helpOpen) {
      this.closeHelp();
    }
  };

  openHelp() {
    if (this.isPlaying()) {
      this.helpOpen = true;
      document.body.style.overflow = "hidden";
      return;
    }
    routerService.navigate("about");
  }

  closeHelp() {
    this.helpOpen = false;
    document.body.style.overflow = "";
  }

  goHome(e: Event) {
    e.preventDefault();
    this.closeHelp();
    const { table } = storeService.getGameState();
    if (!table) {
      storeService.clearGameHost();
    }
    routerService.navigate("/");
    window.dispatchEvent(new Event("show-game-picker"));
  }

  logout() {
    this.closeHelp();
    this.user.value = null;
    storeService.eraseGameState();
    userService.removeUser();
    routerService.navigate("/");
    window.dispatchEvent(new Event("show-game-picker"));
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
