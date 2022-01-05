import { LitElement, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { TranslationController } from "../../controllers/translation.controller";
import { UserController } from "../../controllers/user.controller";
import { navigate } from "../../services/router.service";
import { user, db, userService } from "../../services/user.service";
import { cardsService } from "../../services/cards.service";
import { gunService } from "../../services/gun.service";
import { styles } from "./lobby.styles";

import GUN from "gun";
const encryptKey = "#foo";

const minPLayers = 3;

class Room {
  players: string[] = [];
  hasStarted = false;
}

class LobbyEvent {
  who: string;
  when: number;
  what: Room;
}

import "@material/mwc-button";
import "@material/mwc-formfield";
import "@material/mwc-textfield";

@customElement("card-lobby")
class Lobby extends LitElement {
  static styles = [styles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);

  @query("#username")
  usernameInput: HTMLInputElement;

  @property({ type: String })
  game: string | null = null;

  @property({ type: Object })
  room = new Room();

  @property({ type: Array })
  events: LobbyEvent[] = [];

  @property({ type: Boolean })
  isHost = false;

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

    this.isHost = this.game === this.user.value;
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
    return this.room.players.length === 0
      ? html`<mwc-button
          dense
          unelevated
          @click=${this.createLobby}
          label=${this.i18n.t("lobby.create")}
        ></mwc-button>`
      : html`
          <div class="players-waiting">
            <p>Players Waiting</p>
            ${this.room.players.map((player) => {
              const src =
                "https://avatars.dicebear.com/api/initials/" + player + ".svg";
              return html` <div class="player">
                <img class="player-image" src=${src} alt="avatar" />
                <div class="player-name">${player}</div>
              </div>`;
            })}
          </div>
          ${this.renderHost(this.room.players)}
        `;
  }

  renderHost(players: string[]) {
    return this.isHost
      ? this.renderStartGame(players)
      : this.renderPlayerWaiting(players);
  }

  renderPlayerWaiting(players: string[]) {
    return players.length >= minPLayers
      ? html`<div>Waiting on Host</div>`
      : this.renderMissingPlayers(players);
  }

  renderStartGame(players: string[]) {
    return players.length >= minPLayers
      ? html`<mwc-button
          dense
          unelevated
          @click=${this.startGame}
          label=${this.i18n.t("lobby.start")}
        ></mwc-button>`
      : html`
          ${this.renderMissingPlayers(players)}
          <div class="host">
            <p>${this.i18n.t("lobby.host.you")}</p>
            <p class="invite">${this.i18n.t("lobby.host.invite")}</p>
            <p class="invite-link">${location.href}</p>
          </div>
        `;
  }

  renderMissingPlayers(players: string[]) {
    return html`<p>
      ${this.i18n.t("lobby.missing", {
        amount: minPLayers - players.length - 1,
      })}
    </p>`;
  }

  async createLobby() {
    this.game = this.user.value!;
    sessionStorage.setItem("game", this.game);
    this.isHost = this.game === this.user.value;
    await this.playerJoin();
    navigator.clipboard.writeText(location.href);
    window.history.replaceState(null, "", `lobby?game=${this.user.value}`);
    this.requestUpdate();
    this.connectedCallback();
  }

  _renderEvents(lobbyEvents: LobbyEvent[]): void {
    if (this.events !== lobbyEvents) {
      this.events = lobbyEvents;
      const room = lobbyEvents[lobbyEvents.length - 1].what;
      if (room.hasStarted) {
        const playerString = JSON.stringify(room.players);
        sessionStorage.setItem("players", playerString);
        navigate("rummy");
      }
      if (this.room !== room) {
        this.room = room;
        this.isHost = room.players[0] === this.user.value;
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
    const event = await gunService.getEventFromData(data)
    if (event.what) {
      const events = [...this.events.slice(-100), event].sort(
        (a, b) => a.when - b.when
      ) as LobbyEvent[];
      this._renderEvents(events);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    db.get(`${this.user.value}-rummy-lobby`).off();
  }

  async sendAction(what: Room): Promise<void> {
    if (!this.game) {
      return;
    }
    await gunService.sendAction(`${this.game}-rummy-lobby`, what)
  }

  async playerJoin(): Promise<void> {
    const player = this.user.value;
    if (player && !this.room.players.includes(player)) {
      this.room.players.push(player);
      await this.sendAction(this.room);
    }
  }

  async startGame(): Promise<void> {
    if (!this.room.hasStarted && this.room.players.length > 0) {
      const table = cardsService.createRummyTable(this.room.players);
      const secret = await GUN.SEA.encrypt(table, encryptKey);
      const message = user.get("all").set({ what: secret });
      const index = new Date().toISOString();
      await db
        .get(`${gunService.getPlayersString(this.room.players)}-rummy-game`)
        .get(index)
        .put(message)
        // @ts-ignore
        .then();
      this.room.hasStarted = true;
      await this.sendAction(this.room);
    }
  }

}
