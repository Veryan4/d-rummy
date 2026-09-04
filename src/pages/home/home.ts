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
import { getGame, listGames } from "../../games/registry";
import { GameId } from "../../models";

import "../../material-web";

@customElement("card-home")
class HomeComponent extends LitElement {
  static styles = [lobbySharedStyles, styles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);

  private lobbyHostId: string | undefined;

  @query("#username")
  usernameInput: HTMLInputElement;

  @state()
  isFormValid = false;

  @state()
  private pickedGame = false;

  constructor() {
    super();
    const { table, game, gameType } = storeService.getGameState();
    if (table) {
      routerService.navigate(getGame(table.gameId ?? gameType).route);
    }
    if (game && !userService.getUser()) {
      this.lobbyHostId = game;
      this.pickedGame = true;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("show-game-picker", this.showGamePicker);
    if (this.user.value) {
      this.showGamePicker();
    }
  }

  disconnectedCallback() {
    window.removeEventListener("show-game-picker", this.showGamePicker);
    super.disconnectedCallback();
  }

  private showGamePicker = () => {
    if (storeService.getGameState().table) {
      return;
    }
    storeService.clearGameHost();
    this.lobbyHostId = undefined;
    this.pickedGame = false;
    this.requestUpdate();
  };

  render() {
    return html` <div class="lobby">${this.renderCreateUser()}</div> `;
  }

  renderCreateUser() {
    return this.user.value
      ? this.renderAfterLogin()
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

  renderAfterLogin() {
    if (this.lobbyHostId) {
      return this.renderPublicOrPrivate();
    }
    if (!this.pickedGame) {
      return this.renderGamePicker();
    }
    return this.renderPublicOrPrivate();
  }

  renderGamePicker() {
    return html` <div class="card">
      <h1 class="card-title">${this.i18n.t("lobby.game.title")}</h1>
      <div class="form-buttons">
        ${listGames().map(
          (game) => html`
            <md-filled-button @click=${() => this.pickGame(game.id)}
              >${this.i18n.t(game.titleKey)}</md-filled-button
            >
          `,
        )}
      </div>
    </div>`;
  }

  renderPublicOrPrivate() {
    const definition = getGame(storeService.getGameType());
    return html` <div class="card">
      <h1 class="card-title">${this.i18n.t(definition.titleKey)}</h1>
      <p class="card-subtitle">${this.i18n.t("lobby.privacy.title")}</p>
      <div class="form-buttons">
        <md-filled-button @click=${this.public}
          >${this.i18n.t("lobby.privacy.public")}</md-filled-button
        >
        <md-outlined-button @click=${this.private}
          >${this.i18n.t("lobby.privacy.private")}</md-outlined-button
        >
        ${this.lobbyHostId
          ? ""
          : html`<md-outlined-button @click=${() => (this.pickedGame = false)}
              >${this.i18n.t("lobby.game.change")}</md-outlined-button
            >`}
      </div>
    </div>`;
  }

  pickGame(id: GameId) {
    storeService.setGameType(id);
    this.pickedGame = true;
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
      if (this.lobbyHostId) {
        storeService.setGame(this.lobbyHostId);
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
