import { LitElement, html } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { TranslationController, UserController } from "../../controllers";
import { routerService, userService } from "../../services";
import { buttonStyles, textFieldStyles } from "../../styles";
import { styles } from "./home.styles";

import "@material/mwc-button";
import "@material/mwc-formfield";
import "@material/mwc-textfield";

@customElement("card-home")
class HomeComponent extends LitElement {
  static styles = [styles, buttonStyles, textFieldStyles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);

  private game: string;

  @query("#username")
  usernameInput: HTMLInputElement;

  @state()
  isFormValid = false;

  constructor() {
    super();

    const tableString = sessionStorage.getItem("table");
    if (tableString) {
      routerService.navigate("rummy");
    }

    const gameString = sessionStorage.getItem("game");
    if (gameString) {
      this.game = gameString;
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
            <mwc-textfield
              class="form-field"
              label="${this.i18n.t("lobby.login.name")}"
              id="username"
              type="text"
              name="username"
              required
              validationMessage="A valid username must be submitted"
              @input=${this.checkFormValidity}
            ></mwc-textfield>
          </form>
          <div class="form-buttons">
            <mwc-button
              dense
              unelevated
              ?disabled=${!this.isFormValid}
              @click=${this.login}
              label=${this.i18n.t("lobby.login.button")}
            ></mwc-button>
          </div>
        </div>`;
  }

  renderPublicOrPrivate() {
    return html` <div class="card">
      <h1 class="card-title">${this.i18n.t("lobby.privacy.title")}</h1>
      <div class="form-buttons">
        <mwc-button
          dense
          unelevated
          @click=${this.public}
          label=${this.i18n.t("lobby.privacy.public")}
        ></mwc-button>
        <mwc-button
          dense
          unelevated
          @click=${this.private}
          label=${this.i18n.t("lobby.privacy.private")}
        ></mwc-button>
      </div>
    </div>`;
  }

  checkFormValidity() {
    const requiredFields = this.shadowRoot?.querySelectorAll(
      "[required]"
    ) as NodeListOf<HTMLInputElement>;

    const validFields: boolean[] = [];

    requiredFields.forEach((field) => {
      validFields.push(field.validity.valid);
    });

    this.isFormValid = !validFields.includes(false);
  }

  async login() {
    userService.setUser(this.usernameInput.value);
    setTimeout(() => {
      if (this.game) {
        sessionStorage.setItem("game", this.game);
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
