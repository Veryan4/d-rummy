import { LitElement, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { TranslationController } from "../../controllers/translation.controller";
import { UserController } from "../../controllers/user.controller";
import { navigate } from "../../services/router.service";
import { db, userService } from "../../services/user.service";
import { cardsService } from "../../services/cards.service";
import { gunService } from "../../services/gun.service";
import { Lobby } from "../../models/lobby.model";
import { GunEvent } from "../../models/gun.model";
import { buttonStyles, textFieldStyles } from "../../styles";
import { styles } from "./lobby.styles";

import "@material/mwc-button";
import "@material/mwc-formfield";
import "@material/mwc-textfield";

const MIN_PLAYERS = 3;

@customElement("card-lobby")
class LobbyComponent extends LitElement {
  static styles = [styles, buttonStyles, textFieldStyles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);

  @query("#username")
  usernameInput: HTMLInputElement;

  @property({ type: String })
  game: string | null = null;

  @property({ type: Object })
  lobby = new Lobby();

  @property({ type: Array })
  events: GunEvent<Lobby>[] = [];

  @property({ type: Boolean })
  isFormValid = false;

  constructor() {
    super();

    const urlSearchParams = new URLSearchParams(location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    if (params) {
      this.game = params.game;
    }
    if (!this.game) {
      this.game = sessionStorage.getItem("game");
    }

    if (this.game) {
      this.lobby.host = this.game;
    }
  }

  render() {
    return html`
      <div class="lobby">
        <h1>${this.i18n.t("lobby.title")}</h1>
        ${this.renderCreateUser()}
      </div>
    `;
  }

  renderCreateUser() {
    return this.user.value
      ? this.renderLobby()
      : html` <div class="card">
          <div class="card-title">${this.i18n.t("lobby.login.title")}</div>
          <form class="card-form">
            <mwc-textfield
              class="form-field"
              label="${this.i18n.t("lobby.login.name")}"
              id="username"
              type="text"
              name="username"
              required
              validationMessage="A valid username must be submitted"
              @keydown=${this.checkFormValidity}
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
          <br />
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
    userService.signUpAndLogin(this.usernameInput.value).then(() => {
      if (this.game) {
        this.playerJoin();
      }
    });
  }

  renderLobby() {
    return this.lobby.players.length === 0
      ? html`<mwc-button
          dense
          unelevated
          @click=${this.createLobby}
          label=${this.i18n.t("lobby.create")}
        ></mwc-button>`
      : html`
          <div class="players-waiting">
            <p>Players Waiting</p>
            ${this.lobby.players.map((player) => {
              const src =
                "https://avatars.dicebear.com/api/initials/" + player + ".svg";
              return html` <div class="player">
                <img class="player-image" src=${src} alt="avatar" />
                <div class="player-name">${player}</div>
              </div>`;
            })}
          </div>
          ${this.renderHost(this.lobby.players)}
        `;
  }

  renderHost(players: string[]) {
    return this.lobby.host === this.user.value
      ? this.renderStartGame(players)
      : this.renderPlayerWaiting(players);
  }

  renderPlayerWaiting(players: string[]) {
    return players.length >= MIN_PLAYERS
      ? html`<div>Waiting on Host</div>`
      : this.renderMissingPlayers(players);
  }

  renderStartGame(players: string[]) {
    return players.length >= MIN_PLAYERS
      ? html`<mwc-button
          dense
          unelevated
          @click=${this.startGame}
          label=${this.i18n.t("lobby.start")}
        ></mwc-button>`
      : html`
          ${this.renderMissingPlayers(players)}
          <div class="host">
            <h2>${this.i18n.t("lobby.host.you")}</h2>
            <p class="invite">${this.i18n.t("lobby.host.invite")}</p>
            <p class="invite-link">${location.href}</p>
          </div>
        `;
  }

  renderMissingPlayers(players: string[]) {
    return html`<p>
      ${this.i18n.t("lobby.missing", {
        amount: MIN_PLAYERS - players.length - 1,
      })}
    </p>`;
  }

  async createLobby() {
    this.game = this.user.value!;
    sessionStorage.setItem("game", this.game);
    this.lobby.host = this.user.value!;
    await this.playerJoin();
    navigator.clipboard.writeText(location.href);
    window.history.replaceState(null, "", `lobby?game=${this.user.value}`);
    this.requestUpdate();
    this.connectedCallback();
  }

  async _renderEvents(gunEvents: GunEvent<Lobby>[]): Promise<void> {
    if (this.events !== gunEvents) {
      this.events = gunEvents;
      const lobby = gunEvents[gunEvents.length - 1].what;
      if (lobby.hasStarted) {
        const playerString = JSON.stringify(lobby.players);
        sessionStorage.setItem("players", playerString);
        navigate("rummy");
      }
      if (this.lobby !== lobby) {
        this.lobby = lobby;
        await this.updateComplete;
        this.requestUpdate();
      }
    }
  }

  async connectedCallback(): Promise<void> {
    super.connectedCallback();

    const match = {
      // lexical queries are kind of like a limited RegEx or Glob.
      ".": {
        // property selector
        ">": new Date(+new Date() - 1 * 1000 * 60 * 60 * 3).toISOString(), // find any indexed property larger ~3 hours ago
      },
      "-": 1, // filter in reverse
    };

    if (this.game) {
      db.get(`${this.game}-rummy-lobby`)
        .map(match as any)
        // @ts-ignore
        .then(async (data: any) => {
          if (data) {
            await this.handleGunData(data);
          }
          await this.playerJoin();
        });

      db.get(`${this.game}-rummy-lobby`)
        .map(match as any)
        .on(async (onData) => {
          if (onData) {
            await this.handleGunData(onData);
          }
        });
    }
  }

  private async handleGunData(data: any) {
    const event = await gunService.getEventFromData(data);
    if (event.what) {
      const events = [...this.events.slice(-100), event].sort(
        (a, b) => a.when - b.when
      ) as GunEvent<Lobby>[];
      this._renderEvents(events);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    db.get(`${this.user.value}-rummy-lobby`).off();
  }

  async sendAction(what: Lobby): Promise<void> {
    if (!this.game) {
      return;
    }
    await gunService.sendAction(`${this.game}-rummy-lobby`, what);
  }

  async playerJoin(): Promise<void> {
    const player = this.user.value;
    if (player && !this.lobby.players.includes(player)) {
      this.lobby.players.push(player);
      await this.sendAction(this.lobby);
    }
  }

  async startGame(): Promise<void> {
    if (!this.lobby.hasStarted && this.lobby.players.length > 0) {
      const table = cardsService.createRummyTable(this.lobby.players);
      await gunService.sendAction(
        `${gunService.getPlayersString(this.lobby.players)}-rummy-game`,
        table
      );
      this.lobby.hasStarted = true;
      await this.sendAction(this.lobby);
    }
  }
}
