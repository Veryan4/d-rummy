import { cardsService, encryptService, userService } from "../services";
import Peer, { DataConnection } from "peerjs";
import { config } from "../app.config";
import { Card, PlayerHand, Table } from "../models";
import { EncryptedCard } from "../models/encrypted-card.model";
import { State } from "@veryan/lit-spa";

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
    keys: JsonWebKey[];
  };
}

export class PeerController {
  private peer: Peer;
  private connectionMap = new Map<string, DataConnection>();
  private user = userService.getUser()!;
  private players: string[] = [];
  private others: string[] = [];
  private table: Table;
  private mySecretMap: Record<number, JsonWebKey>;
  private cardsToDecrypt: EncryptedCard[] = [];
  private decryptedLayers: EncryptedCard[] = [];
  private tableInitializationStarted = false;

  tableState = new State<{ table: Table }>();
  connectionState = new State<{ playerName: string; isConnected: boolean }>();
  decryptedCardsState = new State<{
    decryptedCards: Card[];
    encryptedCards: EncryptedCard[];
  }>();

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

  async handlePeerData(data: PeerData) {
    if (data.dataType == PeerDataType.table) {
      this.table = data.table!;
      this.tableState.update({ table: this.table });
      return;
    }
    if (
      data.dataType == PeerDataType.deckEncryption &&
      data.deckEncryption?.to === this.user
    ) {
      const encryptedDeck = await encryptService.reEncryptDeck(
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
          this.tableState.update({ table });
          return;
        }
        this.table.deck = encryptedDeck.encryptedCards;
        this.table.pile = [];
        this.sendTableUpdate(this.table);
        this.tableState.update({ table: this.table });
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
      const decryptedLayers$ = this.decryptedLayers.map((card, i) =>
        encryptService.decryptLayer(card, data.encryptionKeys!.keys[i])
      );
      this.decryptedLayers = await Promise.all(decryptedLayers$);
      let next = this.table.playerOrder[orderIndex - 1];
      if (next == this.user) {
        const secrets = this.decryptedLayers.map(
          (card) => this.mySecretMap[card.id]
        );
        if (orderIndex === 1) {
          this.cardsDecrypted(secrets);
          return;
        }
        const decryptedLayers$ = this.decryptedLayers.map((card, i) =>
          encryptService.decryptLayer(card, secrets[i])
        );
        this.decryptedLayers = await Promise.all(decryptedLayers$);
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
    this.connectionState.update({
      playerName,
      isConnected,
    });
  }

  async initializeDeck(playerOrder?: string[], pile?: Card[]) {
    let order = this.players;
    if (playerOrder) {
      order = playerOrder;
    }
    const deck = pile ? cardsService.shuffle(pile) : cardsService.createDeck();
    const encryptedDeck = await encryptService.encryptDeck(deck);
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

  async decryptCards(cardsToDecrypt: EncryptedCard[]) {
    this.decryptedLayers = cardsToDecrypt;
    this.cardsToDecrypt = cardsToDecrypt;
    let player = this.table.playerOrder.at(-1);
    if (player === this.user) {
      const decryptedLayers$ = cardsToDecrypt.map(async (card) =>
        encryptService.decryptLayer(card, this.mySecretMap[card.id])
      );
      this.decryptedLayers = await Promise.all(decryptedLayers$);
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

  async cardsDecrypted(secrets: JsonWebKey[]) {
    const decryptedLayers$ = this.decryptedLayers.map((card, i) =>
      encryptService.decryptCard(card, secrets[i])
    );
    this.decryptedCardsState.update({
      encryptedCards: this.cardsToDecrypt,
      decryptedCards: await Promise.all(decryptedLayers$),
    });
    this.decryptedLayers = [];
    this.cardsToDecrypt = [];
  }

  disconnect() {
    this.connectionMap.forEach((conn) => conn.close());
    this.peer.disconnect();
  }
}
