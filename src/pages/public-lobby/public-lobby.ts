import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { UserController } from "../../controllers";
import { TranslationController, routerService } from "@veryan/lit-spa";
import { config } from "../../app.config";
import Peer, { DataConnection } from "peerjs";
import { buttonStyles, textFieldStyles } from "../../styles";
import { styles } from "./public-lobby.styles";

import "@veryan/lit-spa";

import "@material/mwc-button";
import "@material/mwc-formfield";
import "@material/mwc-textfield";

const PLAYERS_PER_GAME = 3;
const UPDATE_INTERVAL = 5 * 1000;

function setExpiryTime(milliseconds: number): Date {
  const expiryTime = new Date();
  expiryTime.setMilliseconds(new Date().getMilliseconds() + milliseconds);
  return expiryTime;
}

class PlayerInQueue {
  name: string;
  peerId: string;
  expiresAt: Date;
}

class GameQueue {
  queue?: PlayerInQueue[];
  staging?: string[];
}

@customElement("public-lobby")
class PublicLobbyComponent extends LitElement {
  static styles = [styles, buttonStyles, textFieldStyles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);

  private timer: number;
  private interval = UPDATE_INTERVAL;
  private queue: PlayerInQueue[] = [];

  private peer: Peer;
  private connections: DataConnection[] = [];

  @state()
  staging: string[] = [];

  @state()
  isFormValid = false;

  constructor() {
    super();
  }

  render() {
    return html`
      <div class="lobby">
        ${this.renderWaitingText()}
        ${html`<lit-spa-loader class="small"></lit-spa-loader>`}
      </div>
    `;
  }

  renderWaitingText() {
    return this.playerInStaging()
      ? html`<h1>${this.i18n.t("lobby.public.staging")}</h1>`
      : html`<h1>${this.i18n.t("lobby.public.queue")}</h1>`;
  }

  async connectedCallback(): Promise<void> {
    super.connectedCallback();

    this.connectAsPeer();

    window.onbeforeunload = () => {
      this.disconnect();
    };

    this.timer = setInterval(() => this._updateQueue(), this.interval);
  }

  disconnect() {
    this.connections.forEach((conn) => conn.close());
    this.peer.disconnect();
  }

  connectAsPeer() {
    this.peer = new Peer(`public-rummy-${this.user.value}`, config.peerjs);
    this.peer.on("open", async () => {
      console.log("peer opened");
      const connection = this.peer.connect(`public-rummy-host`);
      connection.on("open", async () => {
        console.log("peer connection opened");
        this.connections.push(connection);
        await this.playerQueued();
      });
      connection.on("close", async () => {
        console.log("peer connection closed");
      });
      connection.on("error", async (err) => {
        console.log("peer connection error");
        console.log(err);
      });
    });
    this.peer.on("close", async () => {
      console.log("peer closed");
    });
    this.peer.on("disconnected", async () => {
      console.log("peer disconnected");
    });
    this.peer.on("error", async (err) => {
      console.log("peer error");
      console.log(err);
      this.becomeHostPeer();
    });
    this.peer.on("connection", async (connection) => {
      console.log("peer connection");
      if (!this.connections.some((conn) => conn.peer === connection.peer)) {
        connection.on("open", async () => {
          console.log("peer queue opened");
          connection.on("data", async (data) => {
            console.log("peer data received");
            await this.handlePeerData(data);
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

  becomeHostPeer() {
    this.peer.disconnect();
    this.peer = new Peer(`public-rummy-host`, config.peerjs);
    this.peer.on("open", async () => {
      this.queue.push({
        name: this.user.value!,
        peerId: this.peer.id,
        expiresAt: setExpiryTime(this.interval * 5),
      });
      console.log("host open");
    });
    this.peer.on("close", async () => {
      console.log("host closed");
    });
    this.peer.on("disconnected", async () => {
      console.log("host disconnected");
    });
    this.peer.on("error", async (err) => {
      console.log("host error");
      console.log(err);
      this.connectAsPeer();
    });
    this.peer.on("connection", async (connection) => {
      console.log("host connection");
      if (!this.connections.some((conn) => conn.peer === connection.peer)) {
        const conn = this.peer.connect(connection.peer);
        conn.on("open", async () => {
          console.log("queued opened");
          this.connections.push(conn);
          await this.playerQueued();
        });
        connection.on("open", async () => {
          console.log("queued opened");
          connection.on("data", async (data) => {
            console.log("host data received");
            await this.handlePeerData(data);
          });
        });
        connection.on("close", async () => {
          console.log("queued closed");
        });
        connection.on("error", async (err) => {
          console.log(err);
        });
      }
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    clearInterval(this.timer);
    this.disconnect();
  }

  private async handlePeerData(gameQueue: GameQueue) {
    if (gameQueue.staging) {
      this.staging = gameQueue.staging;
    }
    if (this.playerInStaging()) {
      this.playerJoinGame();
    }
    if (gameQueue.queue) {
      if (gameQueue.queue.length === 1) {
        if (
          this.queue.some((player) => player.name === gameQueue.queue![0].name)
        ) {
          this.queue = this.queue.map((player) => {
            if (player.name === gameQueue.queue![0].name) {
              return gameQueue.queue![0];
            }
            return player;
          });
        } else {
          this.queue.push(gameQueue.queue[0]);
        }
      } else {
        this.queue = gameQueue.queue;
      }
      this.queue.forEach(async (player) => {
        if (!this.connections.some((conn) => conn.peer === player.peerId)) {
          if (player.name !== this.user.value!) {
            const connection = this.peer.connect(player.peerId);
            connection.on("open", async () => {
              console.log("queued connection opened");
              this.connections.push(connection);
            });
            connection.on("close", async () => {
              console.log("queued connection closed");
            });
          }
        }
      });
    }
    await this.updateComplete;
    this.requestUpdate();
  }

  async _updateQueue(): Promise<void> {
    if (this.queue[0] && this.queue[0].name === this.user.value!) {
      if (this.peer.id !== `public-rummy-host`) {
        this.becomeHostPeer();
      }
      const now = new Date();
      const queue = this.queue.filter(
        (player) =>
          new Date(player.expiresAt) > now || player.name === this.user.value!
      );
      if (queue.length >= PLAYERS_PER_GAME && this.staging.length === 0) {
        const staging = queue.splice(0, 3).map((player) => player.name);
        await this.sendAction({
          queue,
          staging,
        });
        this.queue = queue;
        this.staging = staging;
      } else {
        this.queue = queue;
        await this.sendAction({
          queue,
        });
      }
    }
    if (!this.playerInStaging()) {
      await this.playerQueued();
    } else {
      this.playerJoinGame();
    }
  }

  playerInStaging(): boolean {
    return this.staging.some((player) => player === this.user.value);
  }

  async sendAction(what: GameQueue): Promise<void> {
    if (this.connections.length > 0) {
      this.connections.forEach((connection) => {
        if (connection.open) {
          connection.send(what);
        }
      });
    }
  }

  async playerQueued(): Promise<void> {
    await this.sendAction({
      queue: [
        {
          name: this.user.value!,
          peerId: this.peer.id,
          expiresAt: setExpiryTime(this.interval * 5),
        },
      ],
    });
  }

  async playerJoinGame(): Promise<void> {
    sessionStorage.setItem("players", JSON.stringify(this.staging));
    if (this.staging[0] === this.user.value!) {
      await this.sendAction({
        staging: [],
      });
    }
    setTimeout(() => {
      routerService.navigate("rummy");
    }, 1000);
  }
}
