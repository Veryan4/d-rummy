import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { UserController, PeerNetwork } from "../../controllers";
import { storeService } from "../../services";
import { TranslationController, routerService } from "@veryan/lit-spa";
import { styles } from "./public-lobby.styles";
import { getGame } from "../../games/registry";
import { publicHostId, publicPeerId } from "../../games/peer-ids";

import "@veryan/lit-spa";
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
  static styles = [styles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);

  private get definition() {
    return getGame(storeService.getGameType());
  }

  private get playersPerGame() {
    return this.definition.publicQueueSize;
  }

  private timer: number;
  private interval = UPDATE_INTERVAL;
  private queue: PlayerInQueue[] = [];

  private network: PeerNetwork;

  @state()
  staging: string[] = [];

  @state()
  isFormValid = false;

  private joiningGame = false;

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
    this.network?.disconnect();
  }

  connectAsPeer() {
    this.network?.disconnect();
    this.network = new PeerNetwork(
      publicPeerId(this.user.value!, this.definition.peerNamespace),
      {
        onOpen: (network) => {
          network.connectTo(publicHostId(this.definition.peerNamespace), async () => {
            await this.playerQueued();
          });
        },
        onError: () => {
          this.becomeHostPeer();
        },
        onData: async (data) => {
          await this.handlePeerData(data as GameQueue);
        },
      },
      { label: "peer" },
    );
  }

  becomeHostPeer() {
    this.network?.disconnect();
    this.network = new PeerNetwork(
      publicHostId(this.definition.peerNamespace),
      {
        onOpen: (network) => {
          this.queue.push({
            name: this.user.value!,
            peerId: network.id,
            expiresAt: setExpiryTime(this.interval * 5),
          });
        },
        onError: () => {
          this.connectAsPeer();
        },
        onOutgoingOpen: async () => {
          await this.playerQueued();
        },
        onData: async (data) => {
          await this.handlePeerData(data as GameQueue);
        },
      },
      { connectBack: true, label: "host" },
    );
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    clearInterval(this.timer);
    this.disconnect();
  }

  private async handlePeerData(gameQueue: GameQueue) {
    if (gameQueue.staging !== undefined) {
      if (gameQueue.staging.length > 0 || !this.joiningGame) {
        this.staging = gameQueue.staging;
      }
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
        if (!this.network.hasConnection(player.peerId)) {
          if (player.name !== this.user.value!) {
            this.network.connectTo(player.peerId);
          }
        }
      });
    }
    await this.updateComplete;
    this.requestUpdate();
  }

  async _updateQueue(): Promise<void> {
    if (this.queue[0] && this.queue[0].name === this.user.value!) {
      if (this.network.id !== publicHostId(this.definition.peerNamespace)) {
        this.becomeHostPeer();
      }
      const now = new Date();
      const queue = this.queue.filter(
        (player) =>
          new Date(player.expiresAt) > now || player.name === this.user.value!,
      );
      if (queue.length >= this.playersPerGame && this.staging.length === 0) {
        const staging = queue
          .splice(0, this.playersPerGame)
          .map((player) => player.name);
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
    this.network?.send(what);
  }

  async playerQueued(): Promise<void> {
    await this.sendAction({
      queue: [
        {
          name: this.user.value!,
          peerId: this.network.id,
          expiresAt: setExpiryTime(this.interval * 5),
        },
      ],
    });
  }

  async playerJoinGame(): Promise<void> {
    if (this.joiningGame || this.staging.length < this.playersPerGame) {
      return;
    }
    this.joiningGame = true;
    const players = [...this.staging];
    storeService.setPlayers(players);
    if (players[0] === this.user.value!) {
      await this.sendAction({
        staging: [],
      });
    }
    setTimeout(() => {
      routerService.navigate(this.definition.route);
    }, 1000);
  }
}
