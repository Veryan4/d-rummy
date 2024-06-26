import { cardsService, encryptService, userService } from "../services";
import Peer, { DataConnection } from "peerjs";
import { config } from "../app.config";
import { Card, PlayerHand, Table } from "../models";
import { EncryptedCard } from "../models/encrypted-card.model";

enum PeerDataType {
  table,
  deckEncryption,
  keyRequest,
  encryptionKeys,
}

class PeerData {
  dataType: PeerDataType;
  table?: Table;
  deckEncryption?: {
    to: string;
    playerOrder: string[];
    cards: EncryptedCard[];
  };
  keyRequest?: {
    from: string;
    to: string;
    ids: number[];
  };
  encryptionKeys?: {
    from: string;
    to: string;
    keys: string[];
  };
}

export class PeerController {
  private peer: Peer;
  private connectionMap = new Map<string, DataConnection>();
  private user = userService.getUser()!;
  private players: string[] = [];
  private others: string[] = [];
  private table: Table;
  private mySecretMap: Record<number, string>;
  private cardsToDecrypt: EncryptedCard[] = [];
  private decryptedLayers: EncryptedCard[] = [];
  private tableInitializationStarted = false;

  events = new EventTarget();

  constructor(players: string[], table?: Table) {
    const secretMapString = sessionStorage.getItem("secretMap");
    if (secretMapString) {
      this.mySecretMap = JSON.parse(secretMapString);
    }
    if (table) {
      this.table = table;
    }
    this.players = players;
    this.others = this.players.filter((player) => player != this.user);
    if (this.players.length > 0) {
      this.peer = new Peer(`${this.user}-rummy-game`, config.peerjs);
      this.peer.on("close", () => {
        console.log(`${this.user} peer closed`);
      });
      this.peer.on("disconnected", () => {
        console.log(`${this.user} peer disconnected`);
      });
      this.peer.on("error", (err) => {
        console.log(`${this.user} peer error`);
        console.log(err);
      });
      this.peer.on("connection", (connection) => {
        if (!this.connectionMap.has(connection.peer)) {
          const conn = this.peer.connect(connection.peer);
          const player = conn.peer.split("-")[0];
          conn.on("open", () => {
            console.log("queued opened");
            this.playerConnection(player, true);
            if (!this.connectionMap.has(conn.peer)) {
              this.connectionMap.set(conn.peer, conn);
            }
            conn.on("data", (data) => {
              this.handlePeerData(data as PeerData);
            });
          });
          conn.on("close", () => {
            console.log(`${this.user} queue closed`);
            this.connectionMap.delete(conn.peer);
            this.playerConnection(player, false);
          });
          this.handleConnection(this.user, connection);
        }
      });

      this.peer.on("open", () => {
        console.log(`${this.user} peer open`);
        this.others.forEach((player) => {
          const connection = this.peer.connect(`${player}-rummy-game`);
          if (!this.connectionMap.has(connection.peer)) {
            this.handleConnection(player, connection);
          }
        });
      });
    }
  }

  handleConnection(player: string, connection: DataConnection) {
    connection.on("open", () => {
      console.log(`${player} connection opened`);
      this.playerConnection(player, true);
      if (this.players[0] === this.user && this.table) {
        connection.send({
          dataType: PeerDataType.table,
          table: this.table,
        });
      }
      connection.on("data", (data) => {
        this.handlePeerData(data as PeerData);
      });
      this.connectionMap.set(connection.peer, connection);
    });
    connection.on("close", () => {
      console.log(`${player} connection closed`);
      this.connectionMap.delete(connection.peer);
      this.playerConnection(player, false);
    });
    connection.on("error", (err) => {
      console.log(`${player} connection error`);
      console.log(err);
    });
  }

  handlePeerData(data: PeerData) {
    if (data.dataType == PeerDataType.table) {
      this.table = data.table!;
      this.dispatchData("tableUpdated", data);
      return;
    }
    if (
      data.dataType == PeerDataType.deckEncryption &&
      data.deckEncryption?.to === this.user
    ) {
      const encryptedDeck = encryptService.reEncryptDeck(
        data.deckEncryption.cards
      );
      this.mySecretMap = encryptedDeck.secretMap;
      sessionStorage.setItem("secretMap", JSON.stringify(this.mySecretMap));
      if (data.deckEncryption.playerOrder.at(-1) == this.user) {
        if (encryptedDeck.encryptedCards.length == 52) {
          const table: Table = {
            players: {},
            playerOrder: data.deckEncryption.playerOrder,
            whoseTurn: data.deckEncryption.playerOrder[0],
            deck: encryptedDeck.encryptedCards,
            pile: [],
            hasDrawn: false,
            turn: 0,
          };
          this.players.forEach(
            (player) => (table.players[player] = new PlayerHand())
          );
          this.sendTableUpdate(table);
          this.dispatchData("tableUpdated", { table });
          return;
        }
        this.table.deck = encryptedDeck.encryptedCards;
        this.table.pile = [];
        this.sendTableUpdate(this.table);
        this.dispatchData("tableUpdated", { table: this.table });
        return;
      }
      const userIndex = data.deckEncryption.playerOrder.indexOf(this.user);
      const next = data.deckEncryption.playerOrder[userIndex + 1];
      this.connectionMap.get(`${next}-rummy-game`)?.send({
        dataType: PeerDataType.deckEncryption,
        deckEncryption: {
          to: next,
          cards: encryptedDeck.encryptedCards,
          playerOrder: data.deckEncryption.playerOrder,
        },
      });
      return;
    }
    if (
      data.dataType == PeerDataType.encryptionKeys &&
      data.encryptionKeys?.to === this.user
    ) {
      const orderIndex = this.table.playerOrder.indexOf(
        data.encryptionKeys.from
      );
      if (orderIndex === 0) {
        this.cardsDecrypted(data.encryptionKeys.keys);
        return;
      }
      this.decryptedLayers = this.decryptedLayers.map((card, i) =>
        encryptService.decryptLayer(card.card, data.encryptionKeys!.keys[i])
      );
      let next = this.table.playerOrder[orderIndex - 1];
      if (next == this.user) {
        const secrets = this.decryptedLayers.map(
          (card) => this.mySecretMap[card.id]
        );
        if (orderIndex === 1) {
          this.cardsDecrypted(secrets);
          return;
        }
        this.decryptedLayers = this.decryptedLayers.map((card, i) =>
          encryptService.decryptLayer(card.card, secrets[i])
        );
        next = this.table.playerOrder[orderIndex - 2];
      }
      this.connectionMap.get(`${next}-rummy-game`)?.send({
        dataType: PeerDataType.keyRequest,
        keyRequest: {
          from: this.user,
          to: next,
          ids: this.decryptedLayers.map((card) => card.id),
        },
      });
      return;
    }
    if (
      data.dataType == PeerDataType.keyRequest &&
      data.keyRequest?.to === this.user
    ) {
      this.connectionMap.get(`${data.keyRequest.from}-rummy-game`)?.send({
        dataType: PeerDataType.encryptionKeys,
        encryptionKeys: {
          from: this.user,
          to: data.keyRequest.from,
          keys: data.keyRequest.ids.map((id) => this.mySecretMap[id]),
        },
      });
      return;
    }
  }

  sendTableUpdate(table: Table) {
    this.table = table;
    if (this.connectionMap.size > 0) {
      this.connectionMap.forEach((connection) => {
        if (connection.open && !connection.peer.startsWith(this.user)) {
          connection.send({
            dataType: PeerDataType.table,
            table,
          });
        }
      });
    }
  }

  playerConnection(playerName: string, isConnected: boolean) {
    if (
      !this.tableInitializationStarted &&
      this.connectionMap.size == this.players.length - 1 &&
      this.players[0] == this.user &&
      !this.table?.deck.length
    ) {
      this.tableInitializationStarted = true;
      this.initializeDeck();
    }
    this.dispatchData("playerConnection", {
      playerName,
      isConnected,
    });
  }

  initializeDeck(playerOrder?: string[], pile?: Card[]) {
    let order = this.players;
    if (playerOrder) {
      order = playerOrder;
    }
    const deck = pile ? cardsService.shuffle(pile) : cardsService.createDeck();
    const encryptedDeck = encryptService.encryptDeck(deck);
    this.mySecretMap = encryptedDeck.secretMap;
    sessionStorage.setItem("secretMap", JSON.stringify(this.mySecretMap));
    const next = order[1];
    this.connectionMap.get(`${next}-rummy-game`)?.send({
      dataType: PeerDataType.deckEncryption,
      deckEncryption: {
        to: next,
        cards: encryptedDeck.encryptedCards,
        playerOrder: order,
      },
    });
  }

  decryptCards(cardsToDecrypt: EncryptedCard[]) {
    this.decryptedLayers = cardsToDecrypt;
    this.cardsToDecrypt = cardsToDecrypt;
    let player = this.table.playerOrder.at(-1);
    if (player === this.user) {
      this.decryptedLayers = cardsToDecrypt.map((card) =>
        encryptService.decryptLayer(card.card, this.mySecretMap[card.id])
      );
      player = this.table.playerOrder.at(-2);
    }
    this.connectionMap.get(`${player}-rummy-game`)?.send({
      dataType: PeerDataType.keyRequest,
      keyRequest: {
        from: this.user,
        to: player,
        ids: this.decryptedLayers.map((card) => card.id),
      },
    });
  }

  cardsDecrypted(secrets: string[]) {
    this.dispatchData("decryptedCards", {
      encryptedCards: this.cardsToDecrypt,
      decryptedCards: this.decryptedLayers.map((card, i) =>
        encryptService.decryptCard(card.card, secrets[i])
      ),
    });
    this.decryptedLayers = [];
    this.cardsToDecrypt = [];
  }

  dispatchData(eventName: string, detail: any) {
    const options = {
      detail,
      bubbles: true,
      composed: true,
    };
    this.events.dispatchEvent(new CustomEvent(eventName, options));
  }

  disconnect() {
    this.connectionMap.forEach((conn) => conn.close());
    this.peer.disconnect();
  }
}
