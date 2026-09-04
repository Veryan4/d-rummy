import { LitElement, html } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { UserController } from "../../controllers";
import {
  formService,
  storeService,
  userService,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "../../services";
import { TranslationController, routerService } from "@veryan/lit-spa";
import { styles } from "./home.styles";
import { lobbySharedStyles } from "../../styles/lobby-shared.styles";

import "../../material-web";

@customElement("card-home")
class HomeComponent extends LitElement {
  static styles = [lobbySharedStyles, styles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);

  private game: string;

  @query("#username")
  usernameInput: HTMLInputElement;

  @state()
  isFormValid = false;

  constructor() {
    super();
    const { table, game } = storeService.getGameState();
    if (table) {
      routerService.navigate("rummy");
    }
    if (game) {
      this.game = game;
    }
  }

  render() {
    return html` <div class="lobby">${this.renderCreateUser()}</div> `;
  }

  renderCreateUser() {
    return this.user.value
      ? this.renderPublicOrPrivate()
      : html` <div class="card">
          <h1 class="card-title">${this.i18n.t("lobby.login.title")}</h1>
          <form class="card-form">
            <md-filled-text-field
              class="form-field"
              label="${this.i18n.t("lobby.login.name")}"
              id="username"
              type="text"
              name="username"
              required
              minlength=${USERNAME_MIN_LENGTH}
              maxlength=${USERNAME_MAX_LENGTH}
              pattern=${USERNAME_PATTERN}
              supporting-text="${this.i18n.t("lobby.login.hint")}"
              validationMessage="${this.i18n.t("lobby.login.validation")}"
              @input=${this.onUsernameInput}
            ></md-filled-text-field>
          </form>
          <div class="form-buttons">
            <md-filled-button
              ?disabled=${!this.isFormValid}
              @click=${this.login}
              >${this.i18n.t("lobby.login.button")}</md-filled-button
            >
          </div>
        </div>`;
  }

  renderPublicOrPrivate() {
    return html` <div class="card">
      <h1 class="card-title">${this.i18n.t("lobby.privacy.title")}</h1>
      <div class="form-buttons">
        <md-filled-button @click=${this.public}
          >${this.i18n.t("lobby.privacy.public")}</md-filled-button
        >
        <md-outlined-button @click=${this.private}
          >${this.i18n.t("lobby.privacy.private")}</md-outlined-button
        >
      </div>
    </div>`;
  }

  onUsernameInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const filtered = userService.filterUsernameInput(input.value);
    if (input.value !== filtered) {
      input.value = filtered;
    }
    this.checkFormValidity();
  }

  checkFormValidity() {
    if (this.shadowRoot) {
      this.isFormValid = formService.checkFormValidity(this.shadowRoot);
    }
  }

  async login() {
    const userId = userService.createUserId(this.usernameInput.value);
    if (!userId) {
      this.isFormValid = false;
      return;
    }
    userService.setUser(userId);
    setTimeout(() => {
      if (this.game) {
        storeService.setGame(this.game);
        routerService.navigate("private");
      }
    }, 300);
  }

  public() {
    routerService.navigate("public");
  }

  private() {
    routerService.navigate("private");
  }
}
