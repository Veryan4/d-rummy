import { LitElement, html } from "lit";
import { customElement, state, query } from "lit/decorators.js";
import { classMap } from "lit-html/directives/class-map.js";
import { TranslationController, UserController, SoundController } from "../../controllers";
import { cardsService, toastService, routerService, userService } from "../../services";
import { Card, Table, PlayerHand } from "../../models";
import { config } from "../../app.config"
import Peer, { DataConnection } from "peerjs";
import { CardHand } from "../../components/hand/hand";
import { buttonStyles } from "../../styles";
import { styles } from "./rummy.styles";

import "@material/mwc-button";
import "../../components/game-card/game-card";
import "../../components/hand/hand";
import "../../components/loader/loader";


const yourTurnSound = new Audio("/sounds/your_turn.mp3");
const theirTurnSound = new Audio("/sounds/their_turn.mp3");
const errorSound = new Audio("/sounds/error.mp3");

@customElement("card-rummy")
class Rummy extends LitElement {
  static styles = [styles, buttonStyles];

  private i18n = new TranslationController(this);
  private user = new UserController(this);
  private sound = new SoundController(this);

  private debounceInterval = 250;
  private timer: number;
  private players: string[] = [];

  private peer: Peer;
  private connections: DataConnection[] = [];

  @query("card-hand")
  cardHand: CardHand;

  @state()
  private winner: string | null;

  @state()
  private showPileWarning = false;

  private table: Table = {
    players: {
      [userService.getUser()!]: new PlayerHand(),
    },
    playerOrder: [],
    deck: cardsService.createDeck(),
    pile: [],
    hasDrawn: false,
    turn: 0
  };

  @state()
  private playerOrder: string[] = [];

  @state()
  private deck: Card[] = [];

  @state()
  private pile: Card[] = [];

  @state()
  private hasDrawn: boolean;

  @state()
  private yourSets: Card[][] = [];

  @state()
  private others: {[playerName: string]: PlayerHand} = {};

  constructor() {
    super();

    const tableString = sessionStorage.getItem("table");
    const table = tableString ? JSON.parse(tableString) : null;

    const players = sessionStorage.getItem("players");
    if (players) {
      this.players = JSON.parse(players);
      if (this.players[0] === this.user.value! && !table) {
        const table = cardsService.createRummyTable(this.players);
        this.updateTable(table);
      }
    }

    if (table) {
      this.updateTable(table)
    }
  }

  render() {
    return Object.keys(this.table.players).length > 1 ? this.renderGame() :
      html`<app-loader></app-loader>`
  }

  renderGame() {
    const classes = { draw: this.isYourTurn() && !this.table.hasDrawn, discard: this.isYourTurn() && this.table.hasDrawn };
    return html`
      ${this.renderYourTurn()}
      <div class="table-wrapper">
        <div class="first-half">
          <div>
            <h3>${this.i18n.t("rummy.sets")}</h3>
            <div class="sets">
              ${this.table.players[this.user.value!].sets.map(
                (set) =>{
                  const setLength = {
                    five: set.length === 5,
                    six: set.length === 6,
                    seven: set.length === 7,
                    eight: set.length === 8,
                    nine: set.length === 8,
                    ten: set.length === 10,
                    eleven: set.length === 11,
                    twelve: set.length === 12,
                  }
                  return html` <div
                  class="set ${classMap(setLength)}"
                  @click=${() => this.placeSet(set)}
                >
                  ${set.map(
                    (card) =>
                      html`<game-card
                        class="small"
                        symbol="${card.symbol}"
                        rank="${card.rank}"
                      ></game-card>`
                  )}
                </div>`
                }
              )}
              <div class="set empty" @click=${() => this.placeNewSet()}>
                <div class="empty-card">${this.i18n.t("rummy.add_set")}</div>
              </div>
            </div>
          </div>
          <div>
            <h3>${this.i18n.t("rummy.others")}</h3>
            <div class="others">${this.renderOthers()}</div>
          </div>
        </div>
        <div class="second-half">
          <div class="table ${classMap(classes)}">
            <div class="deck" @click=${this.drawFromDeck}>
              <h3>${this.i18n.t("rummy.deck")}</h3>
              <div class="row">
                ${this.renderDeck()}
                <div class="count">${this.table.deck.length}</div>
              </div>
            </div>
            <div class="pile ${classMap(classes)}" @click=${this.touchPile}>
              <h3>${this.i18n.t("rummy.pile")}</h3>
              <div class="row">
                ${this.renderPile()}
                <div class="count">${this.table.pile.length}</div>
              </div>
            </div> 
          </div>
          <h3>${this.i18n.t("rummy.hand")}</h3>
          <card-hand></card-hand>
        </div>
      </div>
      ${this.renderGameWinner()} ${this.renderPileWarning()}
    `;
  }

  renderYourTurn() {
    return this.isYourTurn()
      ? html`<h1>${this.i18n.t("rummy.you")}</h1>`
      : html`<h1>${this.i18n.t("rummy.them", {user: this.table.playerOrder[0]})}</h1>`;
  }

  renderDeck() {
    return this.table.deck.length > 0
      ? html`<game-card
          class="small"
          symbol="♠"
          rank="2"
          .unrevealed=${true}
        ></game-card>`
      : html`<div class="empty-card" @click=${this.flipPileToDeck}>
          ${this.i18n.t("rummy.flip_discard")}
        </div>`;
  }

  renderPile() {
    let topCard = null;
    if (this.table.pile.length > 0) {
      topCard = this.table.pile[this.table.pile.length - 1];
    }
    return topCard
      ? html`<game-card
          class="small"
          symbol="${topCard.symbol}"
          rank="${topCard.rank}"
        ></game-card>`
      : html`<div class="empty-card">${this.i18n.t("rummy.empty")}</div>`;
  }

  renderOthers() {
    const players = Object.keys(this.table.players);
    const others = players.filter((player) => player != this.user.value);
    return others.map((other) => {
      const src = "https://avatars.dicebear.com/api/initials/" + other + ".svg";
      const classes = { active: other == this.table.playerOrder[0], error: !this.table.players[other].connected };
      return html`
        <div class="other ${classMap(classes)}">
          <div class="other-info">
            <img class="player-image" src=${src} alt="avatar" />
            <div class="other-name ${classMap(classes)}">
              ${this.table.players[other].connected ? 
                html`${this.i18n.t("rummy.player", {
                  player: other,
                  amount: this.table.players[other].hand.length,
                })}`:
                html`${this.i18n.t("rummy.disconnected", {
                  player: other,
                })}`}
            </div>
          </div>
          <div class="other-sets">
            ${this.table.players[other].sets &&
            this.table.players[other].sets.length > 0
              ? this.table.players[other].sets.map(
                  (set) =>{
                    const setLength = {
                      five: set.length === 5,
                      six: set.length === 6,
                      seven: set.length === 7,
                      eight: set.length === 8,
                      nine: set.length === 8,
                      ten: set.length === 10,
                      eleven: set.length === 11,
                      twelve: set.length === 12,
                    }
                    return  html` <div
                    class="set ${classMap(setLength)}"
                    @click=${() => this.placeOthersSet(set, other)}
                  >
                    ${set.map(
                      (card) =>
                        html`<game-card
                          class="small"
                          symbol="${card.symbol}"
                          rank="${card.rank}"
                        ></game-card>`
                    )}
                  </div>`

                  }
                   
                )
              : html` <div class="set empty">
                  ${this.i18n.t("rummy.no_set")}
                </div>`}
          </div>
        </div>
        ${other !== this.table.playerOrder[0] &&
        other !== others[others.length - 1]
          ? html`<hr />`
          : ""}
      `;
    });
  }

  renderGameWinner() {
    return this.winner
      ? html` <div class="winner-overlay">
          <div class="winner-modal">
            <div class="winner-text">
              <b>${this.winner}</b> ${this.i18n.t("rummy.win")}
            </div>
            <div class="winner-buttons">
              <mwc-button
                style="margin-right:1rem;"
                dense
                unelevated
                @click=${this.rematch}
                label=${this.i18n.t("rummy.rematch")}
              ></mwc-button>
              <mwc-button
                dense
                @click=${this.returnToLobby}
                label=${this.i18n.t("rummy.return")}
              ></mwc-button>
            </div>
          </div>
        </div>`
      : "";
  }

  renderPileWarning() {
    return this.showPileWarning
      ? html` <div class="winner-overlay">
          <div class="winner-modal">
            <div class="winner-text">
              ${this.i18n.t("rummy.pile_warning", {
                count: this.table.pile.length,
              })}
            </div>
            <div class="winner-buttons">
              <mwc-button
                style="margin-right:1rem;"
                dense
                unelevated
                @click=${this.drawFromPile}
                label=${this.i18n.t("rummy.yes")}
              ></mwc-button>
              <mwc-button
                dense
                @click=${() => (this.showPileWarning = false)}
                label=${this.i18n.t("rummy.no")}
              ></mwc-button>
            </div>
          </div>
        </div>`
      : "";
  }

  async connectedCallback(): Promise<void> {
    super.connectedCallback();

    if (this.players.length > 0) {
      this.peer = new Peer(`${this.user.value}-rummy-game`, config.peerjs)
      this.peer.on('close', async () => {
        console.log(`${this.user.value} peer closed`)
      });
      this.peer.on('disconnection', async () => {
        console.log(`${this.user.value} peer disconnected`)
      });
      this.peer.on('error', async (err) => {
        console.log(`${this.user.value} peer error`)
        console.log(err)
      });
      this.peer.on('connection', (connection) => {
        if (!this.connections.some(conn => conn.peer === connection.peer)) {
          const conn = this.peer.connect(connection.peer);
          const player = conn.peer.split("-")[0];
          conn.on('open', async () => {
            console.log("queued opened")
            await this.playerConnection(player, true);
            if (!this.connections.some(c => c.peer === conn.peer)) {
              this.connections.push(conn);
            }
          })
          conn.on('close', async () => {
            console.log(`${this.user.value} queue closed`)
            this.connections = this.connections.filter(c => c.peer !== conn.peer);
            await this.playerConnection(player, false);
          });
          connection.on('open', async () => {
            console.log(`${this.user.value} connection opened`)
            await this.playerConnection(player, true);
            connection.on('data', async (data) => {
              await this.handlePeerData(data);
            });
          })
          connection.on('close', async () => {
            console.log(`${this.user.value} connection closed`)
            this.connections = this.connections.filter(conn => conn.peer !== connection.peer);
            await this.playerConnection(player, false);
          });
          connection.on('error', async (err) => {
            console.log(`${this.user.value} connection error`)
            console.log(err)
          });
        }
      });
      
      this.peer.on('open', async () => {
        console.log(`${this.user.value} peer open`)
        this.players.forEach(player => {
          if (player !== this.user.value){
            const connection = this.peer.connect(`${player}-rummy-game`);
            if (!this.connections.some(conn => conn.peer === connection.peer)) {
              connection.on('open', async () => {
                console.log(`${player} connection opened`)
                await this.playerConnection(player, true);
                if (this.players[0] === this.user.value!) {
                  connection.send(this.table);
                }
                connection.on('data', async (data) => {
                  await this.handlePeerData(data);
                });
                this.connections.push(connection);
              })
              connection.on('close', async () => {
                console.log(`${player} connection closed`)
                this.connections = this.connections.filter(conn => conn.peer !== connection.peer);
                await this.playerConnection(player, false);
              });
              connection.on('error', async (err) => {
                console.log(`${player} connection error`)
                console.log(err)
              });
            }
          }
        })
      });
    }

    window.onbeforeunload = () => {
      this.disconnect();
    };
  }

  async playerConnection(playerName: string, isConnected: boolean) {
    if (!isConnected) {
      if (this.isGameOver(this.table)) {
        this.returnToLobby()
      }
    }
    if (this.table.players[playerName]){
      this.table.players[playerName].connected = isConnected
      await this.throtteledRequestUpdate();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    this.disconnect();
  }

  private async handlePeerData(table: Table) {
    if (this.table !== table) {
      clearTimeout(this.timer);
      this.timer = setTimeout(async() => {
        await this.updateTable(table)
      }, this.debounceInterval)
    }
  }

  disconnect() {
    this.connections.forEach(conn => conn.close())
    this.peer.disconnect();
  }

  async sendAction(what: Table): Promise<void> {
    if (this.connections.length > 0) {
      this.updateTable(what)
      this.connections.forEach((connection) => {
        if (connection.open) {
          connection.send(what)
        }
      })
    }
  }

  async updateTable(table: Table) {
    // prevent page refresh + click to turn back time
    if (table.turn < this.table.turn && table.turn !== 0) {
      return
    }

    // Prevents hand being modified if it' s not your turn
    const hand = this.table.players[this.user.value!].hand;
    if (
      table.playerOrder[0] !== this.user.value &&
      table.hasDrawn &&
      hand.length > 0
    ) {
      table.players[this.user.value!].hand = hand;
    }
    
    this.tableToStates(table); 
    sessionStorage.setItem("table", JSON.stringify(table));

    // Sounds
    if (!table.hasDrawn) {
      if (table.playerOrder[0] === this.user.value) {
        this.sound.play(yourTurnSound);
      } else {
        this.sound.play(theirTurnSound);
      }
    }

    // Checks for EndGame
    this.winner = this.isGameOver(this.table);
    if (this.winner) {
      this.cardHand.unselectAll();
    }

    if (this.isYourTurn() && !this.table.hasDrawn) {
      toastService.newToast("rummy.you");
    }

    await this.throtteledRequestUpdate();
  }

  async tableToStates(table: Table) {
    this.table = table

    if (this.playerOrder !== table.playerOrder) {
      this.playerOrder = table.playerOrder
    }

    if (this.deck !== table.deck) {
      this.deck = table.deck
    }

    if (this.pile !== table.pile) {
      this.pile = table.pile
    }

    if (this.yourSets !== table.players[this.user.value!].sets) {
      this.yourSets = table.players[this.user.value!].sets
    }

    const otherPlayers = this.players.filter(player => player !== this.user.value)
    otherPlayers.forEach(other => {
      if(this.others[other] !== table.players[other]) {
        this.others[other] = table.players[other]
      }
    })

    if (this.hasDrawn !== table.hasDrawn && table.playerOrder[0] === this.user.value) {
      this.hasDrawn = table.hasDrawn
    }

    await this.updateComplete;
    this.cardHand.setCards(table.players[this.user.value!].hand)
  }

  async throtteledRequestUpdate() {
    await this.updateComplete;
    this.requestUpdate();
  }

  isYourTurn(): boolean {
    return this.table.playerOrder[0] === this.user.value;
  }

  drawFromDeck(): void {
    if (this.table.hasDrawn) {
      return;
    }
    if (!this.isYourTurn()) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.wait_your_turn");
      return;
    }
    const table = {
      ...this.table,
      hasDrawn: true,
      deck: cardsService.shuffle(this.table.deck)
    }
    cardsService.moveCard(
      table.deck,
      table.players[this.user.value!].hand,
      "top",
      "bottom"
    );
    this.updateTable(table)
    this.sendAction(table);
  }

  touchPile() {
    if (this.table.hasDrawn) {
      this.discardToPile();
    } else {
      if (this.table.pile.length > 1) {
        if (!this.isYourTurn()) {
          this.sound.play(errorSound);
          toastService.newError("rummy.error.wait_your_turn");
          return;
        }
        this.showPileWarning = true;
      } else {
        this.drawFromPile();
      }
    }
  }

  drawFromPile(): void {
    if (this.table.hasDrawn || this.table.pile.length === 0) {
      return;
    }
    if (!this.isYourTurn()) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.wait_your_turn");
      return;
    }
    const table = {
      ...this.table,
      hasDrawn: true
    }
    this.table.hasDrawn = true;

    cardsService.moveCards(
      table.pile,
      table.players[this.user.value!].hand,
      "top",
      "top",
      table.pile.length
    );

    this.updateTable(table)
    this.sendAction(table);
    this.showPileWarning = false;
  }

  placeOthersSet(cards: Card[], otherPlayer: string) {
    if (this.table.players[this.user.value!].sets.length === 0) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.place_set_first");
      return;
    }
    this.placeSet(cards, otherPlayer);
    toastService.newToast("rummy.place_other_set", {from: this.user.value!, to: otherPlayer})
  }

  placeSet(cards: Card[], otherPlayer?: string) {
    const selected = this.cardHand.getSelectedCards();
    let set = cards.concat(selected).map((card) => {
      card.selected = false;
      return card;
    });
    set = [...new Set(set)].sort((a, b) =>
      a.value > b.value ? 1 : b.value > a.value ? -1 : 0
    );

    if (!this.isYourTurn()) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.wait_your_turn");
      return;
    }
    if (set.length < 3) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.need_3_cards");
      return;
    }
    if (!cardsService.isValidRummySet(set)) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.need_valid_set");
      return;
    }

    const user = this.user.value!;
    const player = otherPlayer ? otherPlayer : user;
    const players = {
      ...this.table.players
    }
  
    players[player].sets = this.table.players[player].sets.map(
      (s) => {
        if (set.some((c) => s[0].id === c.id)) {
          return set;
        }
        return s;
      }
    );

    players[user].hand = this.table.players[user].hand.filter(
      (c) => !set.some((card) => card.id === c.id)
    );
    
    const table = {
      ...this.table,
      players
    }
    this.updateTable(table)
    this.sendAction(table);
  }

  placeNewSet() {
    const selected = this.cardHand.getSelectedCards();
    let set = selected.map((card) => {
      card.selected = false;
      return card;
    });
    set = [...new Set(set)].sort((a, b) =>
      a.value > b.value ? 1 : b.value > a.value ? -1 : 0
    );

    if (!this.isYourTurn()) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.wait_your_turn");
      return;
    }
    if (set.length < 3) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.need_3_cards");
      return;
    }
    if (!cardsService.isValidRummySet(set)) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.need_valid_set");
      return;
    }

    const user = this.user.value!;
    const players = {
      ...this.table.players
    }

    players[user].sets.push(set);
    players[user].hand = this.table.players[user].hand.filter(
      (c) => !set.some((card) => card.id === c.id)
    );

    const table = {
      ...this.table,
      players
    }
    this.cardHand.unselectAll();
    this.updateTable(table)
    this.sendAction(table);
  }

  //ends turn
  discardToPile(): void {
    if (!this.table.hasDrawn) {
      return;
    }
    if (!this.isYourTurn()) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.wait_your_turn");
      return;
    }

    const selected = this.cardHand.getSelectedCards();

    if (selected.length === 0) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.select_discard");
      return;
    }
    if (selected.length !== 1) {
      this.sound.play(errorSound);
      toastService.newError("rummy.error.only_discard_1");
      return;
    }

    const card = selected[0];
    card.selected = false;
    this.cardHand.unselectAll();

    const players = {
      ...this.table.players
    }
    players[this.user.value!].hand = players[this.user.value!].hand.filter((c) => card.id !== c.id)
    
    const playerOrder = [...this.table.playerOrder]
    playerOrder.push(playerOrder.shift()!)

    const table = {
      ...this.table,
      players,
      pile: [...this.table.pile, card],
      playerOrder,
      hasDrawn: false,
      turn: this.table.turn + 1
    }

    this.updateTable(table)
    this.sendAction(table);
  }

  isGameOver(table: Table): string | null {
    let gameOver = null;
    table.playerOrder.forEach((player) => {
      if (table.players[player].hand.length === 0) {
        gameOver = player;
      }
    });
    return gameOver;
  }

  rematch() {
    const table = cardsService.createRummyTable(this.table.playerOrder);
    this.updateTable(table);
    this.sendAction(table);
  }

  returnToLobby() {
    sessionStorage.removeItem("game");
    sessionStorage.removeItem("table");
    routerService.navigate("");
  }

  flipPileToDeck() {
    if (this.table.hasDrawn || !this.isYourTurn()) {
      return;
    }
    const table = {
      ...this.table,
      deck: this.table.pile.reverse(),
      pile: []
    }
    this.updateTable(table);
    this.sendAction(table);
  }

}
