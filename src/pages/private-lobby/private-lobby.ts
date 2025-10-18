import { LitElement, html } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { UserController } from "../../controllers";
import { TranslationController, routerService } from "@veryan/lit-spa";
import { Lobby } from "../../models";
import { config } from "../../app.config";
import Peer, { DataConnection } from "peerjs";
import { styles } from "./private-lobby.styles";

import "../../material-web";

const MIN_PLAYERS = 2;

@customElement("private-lobby")
class PrivateLobbyComponent extends LitElement {
  static styles = [styles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);

  private game: string | null = null;

  private peer: Peer;
  private connections: DataConnection[] = [];

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

    const paramsString = sessionStorage.getItem("params");
    if (paramsString) {
      const params = JSON.parse(paramsString);
      if (params) {
        this.game = params.game;
      }
    }

    if (!this.game) {
      this.game = sessionStorage.getItem("game");
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
            <div class="player-name">${player}</div>
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
      if (this.peer) {
        this.disconnect();
      }
      if (this.game === this.user.value!) {
        this.connectAsHost();
      } else {
        this.connectAsPeer();
      }

      this.peer.on("close", async () => {
        console.log(`${this.user.value} peer closed`);
      });
      this.peer.on("disconnected", async () => {
        console.log(`${this.user.value} peer disconnected`);
      });
      this.peer.on("error", async (err) => {
        console.log(`${this.user.value} peer error`);
        console.log(err);
      });
    }

    window.onbeforeunload = () => {
      this.disconnect();
    };
  }

  connectAsHost() {
    this.peer = new Peer(`${this.game}-rummy-lobby`, config.peerjs);
    this.peer.on("open", async () => {
      console.log(`${this.user.value} peer open`);
    });
    this.peer.on("connection", (connection) => {
      console.log(
        `${connection.peer} connection received by ${this.user.value}`
      );
      if (!this.connections.some((conn) => conn.peer === connection.peer)) {
        const conn = this.peer.connect(connection.peer);
        conn.on("open", async () => {
          console.log("queued opened");
          this.connections.push(conn);
          this.lobby.host = this.user.value!;
          const player = connection.peer.replace("-rummy-lobby", "");
          if (!this.lobby.players.some((p) => p === player)) {
            this.lobby.players.push(player);
          }
          this.requestUpdate();
          await this.sendAction(this.lobby);
        });
        connection.on("open", async () => {
          console.log(`${this.user.value} connection opened`);
          const player = connection.peer.replace("-rummy-lobby", "");
          if (!this.lobby.players.some((p) => p === player)) {
            this.lobby.players.push(player);
          }
          this.requestUpdate();
          connection.on("data", async (data) => {
            await this.handlePeerData(data as any);
            this.requestUpdate();
          });
        });
        connection.on("close", async () => {
          console.log(`${this.user.value} connection closed`);
        });
        connection.on("error", async (err) => {
          console.log(`${this.user.value} connection error`);
          console.log(err);
        });
      }
    });
  }

  connectAsPeer() {
    this.peer = new Peer(`${this.user.value}-rummy-lobby`, config.peerjs);
    this.peer.on("open", async () => {
      console.log(`${this.user.value} peer open`);
      const connection = this.peer.connect(`${this.game}-rummy-lobby`);
      connection.on("open", async () => {
        console.log(`${this.user.value} connection opened`);
        this.connections.push(connection);
      });
      connection.on("close", async () => {
        console.log(`${this.user.value} connection closed`);
      });
      connection.on("error", async (err) => {
        console.log(`${this.user.value} connection error`);
        console.log(err);
      });
    });
    this.peer.on("connection", async (connection) => {
      console.log("peer connection");
      if (!this.connections.some((conn) => conn.peer === connection.peer)) {
        connection.on("open", async () => {
          console.log("peer queue opened");
          connection.on("data", async (data) => {
            console.log("peer data received");
            await this.handlePeerData(data as any);
          });
          connection.on("close", async () => {
            console.log("peer queued closed");
          });
          connection.on("error", async (err) => {
            console.log(err);
          });
        });
      }
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    sessionStorage.removeItem("params");
    sessionStorage.removeItem("lobby");
    this.disconnect();
  }

  disconnect() {
    this.connections.forEach((conn) => conn.close());
    this.peer.disconnect();
  }

  private async handlePeerData(lobby: Lobby) {
    if (this.lobby !== lobby) {
      sessionStorage.setItem("lobby", JSON.stringify(lobby));
      if (lobby.hasStarted) {
        const playerString = JSON.stringify(lobby.players);
        sessionStorage.setItem("players", playerString);
        routerService.navigate("rummy");
      }
      this.lobby = lobby;
      await this.updateComplete;
      this.requestUpdate();
    }
  }

  async sendAction(what: Lobby): Promise<void> {
    if (this.game && this.connections.length > 0) {
      this.connections.forEach((connection) => {
        if (connection.open) {
          connection.send(what);
        }
      });
    }
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

  async createLobby() {
    this.game = this.user.value!;
    this.lobby.players.push(this.game);
    this.lobby.host = this.game;
    sessionStorage.setItem("game", this.game);
    window.history.replaceState(null, "", `private?game=${this.user.value}`);
    navigator.clipboard.writeText(location.href);
    this.requestUpdate();
    this.connectedCallback();
  }

  async startGame(): Promise<void> {
    if (!this.lobby.hasStarted && this.lobby.players.length > 0) {
      this.lobby.hasStarted = true;
      sessionStorage.setItem("players", JSON.stringify(this.lobby.players));
      await this.sendAction(this.lobby);
      setTimeout(() => {
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
