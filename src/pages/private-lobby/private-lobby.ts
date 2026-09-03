import { LitElement, html } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { UserController, PeerNetwork } from "../../controllers";
import { formService, storeService } from "../../services";
import { TranslationController, routerService } from "@veryan/lit-spa";
import { Lobby } from "../../models";
import { styles } from "./private-lobby.styles";

import "../../material-web";

const MIN_PLAYERS = 2;

@customElement("private-lobby")
class PrivateLobbyComponent extends LitElement {
  static styles = [styles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);

  private game: string | null = null;

  private network: PeerNetwork;

  @query("#lobby")
  lobbyInput: HTMLInputElement;

  @state()
  lobby = new Lobby();

  @state()
  isFormValid = false;

  @state()
  createOrJoin = "";

  constructor() {
    super();

    if (!this.game) {
      const { game } = storeService.getGameState();
      this.game = game;
    }

    if (this.game) {
      this.lobby.host = this.game;
      this.lobby.players.push(this.game);
      this.createOrJoin = "join";
    }

    const lobbyString = sessionStorage.getItem("lobby");
    if (lobbyString) {
      this.lobby = JSON.parse(lobbyString);
    }
  }

  render() {
    return html` <div class="lobby">${this.renderNextSteps()}</div> `;
  }

  renderNextSteps() {
    if (this.lobby.players.length !== 0) {
      return this.renderLobby();
    }
    if ((this, this.createOrJoin === "join")) {
      return this.renderJoin();
    }
    return this.renderCreateOrJoin();
  }

  renderLobby() {
    return html`
      <div class="players-waiting">
        <p>${this.i18n.t("lobby.private.waiting")}</p>
        ${this.lobby.players.map((player) => {
          const src =
            "https://api.dicebear.com/7.x/pixel-art/svg?seed=" + player;
          return html` <div class="player">
            <img class="player-image" src=${src} alt="avatar" />
            <div class="player-name">${player.split("-")[0]}</div>
          </div>`;
        })}
      </div>
      ${this.renderHost(this.lobby.players)}
    `;
  }

  renderCreateOrJoin() {
    return html` <div class="card">
      <h1 class="card-title">${this.i18n.t("lobby.private.create_or_join")}</h1>
      <div class="form-buttons">
        <md-filled-button @click=${this.createLobby}
          >${this.i18n.t("lobby.private.create")}</md-filled-button
        >
        <md-outlined-button @click=${() => (this.createOrJoin = "join")}
          >${this.i18n.t("lobby.private.join")}</md-outlined-button
        >
      </div>
    </div>`;
  }

  renderJoin() {
    return html`
      <div class="card">
        <h1 class="card-title">${this.i18n.t("lobby.private.join_title")}</h1>
        <form class="card-form">
          <md-filled-text-field
            class="form-field"
            label="${this.i18n.t("lobby.private.join_description")}"
            id="lobby"
            type="text"
            name="lobby"
            required
            validationMessage="Can't find a lobby with that name"
            @input=${this.checkFormValidity}
          ></md-filled-text-field>
        </form>
        <div class="form-buttons">
          <md-filled-button ?disabled=${!this.isFormValid} @click=${this.join}
            >${this.i18n.t("lobby.private.join")}</md-filled-button
          >
        </div>
      </div>
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
      ? html`<md-filled-button @click=${this.startGame}
          >${this.i18n.t("lobby.start")}</md-filled-button
        >`
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
        amount: MIN_PLAYERS - players.length,
      })}
    </p>`;
  }

  async connectedCallback(): Promise<void> {
    super.connectedCallback();

    if (this.game) {
      this.network?.disconnect();
      if (this.game === this.user.value!) {
        this.connectAsHost();
      } else {
        this.connectAsPeer();
      }
    }

    window.onbeforeunload = () => {
      this.disconnect();
    };
  }

  connectAsHost() {
    this.network = new PeerNetwork(
      `${this.game}-rummy-lobby`,
      {
        onOutgoingOpen: async (connection) => {
          this.lobby.host = this.user.value!;
          this.addLobbyPlayer(connection.peer);
          await this.sendAction(this.lobby);
        },
        onIncomingOpen: (connection) => {
          this.addLobbyPlayer(connection.peer);
        },
        onData: async (data) => {
          await this.handlePeerData(data as Lobby);
          this.requestUpdate();
        },
      },
      { connectBack: true, label: this.user.value! },
    );
  }

  connectAsPeer() {
    this.network = new PeerNetwork(
      `${this.user.value}-rummy-lobby`,
      {
        onOpen: (network) => {
          network.connectTo(`${this.game}-rummy-lobby`);
        },
        onData: async (data) => {
          await this.handlePeerData(data as Lobby);
        },
      },
      { label: this.user.value! },
    );
  }

  private addLobbyPlayer(peerId: string) {
    const player = peerId.replace("-rummy-lobby", "");
    if (!this.lobby.players.some((p) => p === player)) {
      this.lobby.players.push(player);
    }
    this.requestUpdate();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    storeService.eraseLobbyState();
    this.disconnect();
  }

  disconnect() {
    this.network?.disconnect();
  }

  private async handlePeerData(lobby: Lobby) {
    if (this.lobby !== lobby) {
      sessionStorage.setItem("lobby", JSON.stringify(lobby));
      if (lobby.hasStarted) {
        storeService.setPlayers(lobby.players);
        sessionStorage.removeItem("lobby");
        routerService.navigate("rummy");
      }
      this.lobby = lobby;
      await this.updateComplete;
      this.requestUpdate();
    }
  }

  async sendAction(what: Lobby): Promise<void> {
    if (this.game) {
      this.network?.send(what);
    }
  }

  checkFormValidity() {
    if (this.shadowRoot) {
      this.isFormValid = formService.checkFormValidity(this.shadowRoot);
    }
  }

  async createLobby() {
    this.game = this.user.value!;
    this.lobby.players.push(this.game);
    this.lobby.host = this.game;
    storeService.setGame(this.game);
    window.history.replaceState(null, "", `private?game=${this.user.value}`);
    navigator.clipboard.writeText(location.href);
    this.requestUpdate();
    this.connectedCallback();
  }

  async startGame(): Promise<void> {
    if (!this.lobby.hasStarted && this.lobby.players.length > 0) {
      this.lobby.hasStarted = true;
      storeService.setPlayers(this.lobby.players);
      await this.sendAction(this.lobby);
      setTimeout(() => {
        sessionStorage.removeItem("lobby");
        routerService.navigate("rummy");
      }, 1000);
    }
  }

  join() {
    const game = this.lobbyInput.value!;
    this.game = game;
    console.log(this.game);
    this.connectedCallback();
  }
}
