import { LitElement, html } from "lit";
import { customElement, query } from "lit/decorators.js";
import { TranslationController } from "../../controllers/translation.controller";
import { DeviceController } from "../../controllers/device.controller";
import { SoundController } from "../../controllers/sound.controller";
import { useLanguage } from "../../services/translate.service";
import { userService } from "../../services/user.service";
import { themeService } from "../../services/theme.service";
import { UserController } from "../../controllers/user.controller";
import { styles } from "./top-bar.styles";
import { topAppBarStyles, iconButtonStyles, menuStyles } from "../../styles";

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
          <a href="/lobby" class="logo"></a>
        </section>
        <section
          class="mdc-top-app-bar__section mdc-top-app-bar__section--align-end"
          role="toolbar"
        >
          <div style="position: relative;">
            <div style="cursor:pointer" @click=${() => (this.menu.open = true)}>
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
    </header>`;
  }

  renderMenu() {
    return html`
      <mwc-menu
        id="menu"
        .anchor=${this.anchor}
        .corner=${this.device.isMobile ? "TOP_RIGHT" : "TOP_LEFT"}
        .menuCorner=${this.device.isMobile ? "END" : "START"}
      >
        <mwc-list-item
          ><a href="/about"
            ><i class="material-icons mdc-icon-button__icon">info</i
            >${this.i18n.t("header.about")}</a
          ></mwc-list-item
        >
        <mwc-list-item @click=${themeService.changeTheme}>
          <i class="material-icons mdc-icon-button__icon">invert_colors</i>
          ${this.i18n.t("header.dark_mode")}
        </mwc-list-item>
        <mwc-list-item @click=${this.toggleSound}>
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
        <mwc-list-item @click=${(e: Event) => this.language("en")}>
          <i class="material-icons mdc-icon-button__icon flag uk-flag"></i>
          English
        </mwc-list-item>
        <mwc-list-item @click=${(e: Event) => this.language("fr")}>
          <i class="material-icons mdc-icon-button__icon flag fr-flag"></i>
          Francais
        </mwc-list-item>
      </mwc-menu>
    `;
  }

  toggleSound() {
    window.dispatchEvent(new Event("sound-update"));
  }

  connectedCallback() {
    super.connectedCallback();
    // re-renders the mwc-menu
    setTimeout(() => this.requestUpdate(), 300);
  }

  async logout(): Promise<void> {
    this.user.value = null;
    await userService.signOut();
  }

  language(lang: string): void {
    useLanguage(lang);
  }
}
