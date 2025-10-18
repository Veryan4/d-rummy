import { cardsService, encryptService, userService } from "../services";
import Peer, { DataConnection } from "peerjs";
import { config } from "../app.config";
import {
  Card,
  DeckEncryption,
  EncryptionKeys,
  KeyRequest,
  PeerData,
  PeerDataType,
  PlayerHand,
  Table,
  EncryptedCard,
} from "../models";
import { State } from "@veryan/lit-spa";

export class PeerController {
  private peer: Peer;
  private connectionMap = new Map<string, DataConnection>();
  private user = userService.getUser()!;
  private players: string[] = [];
  private table: Table;
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
    if (table) {
      this.table = table;
    }
    this.players = players;
    if (this.players.length > 0) {
      this.setupNTwoWayPeerConnections();
    }
  }

  setupNTwoWayPeerConnections() {
    const others = this.players.filter((player) => player != this.user);
    this.peer = new Peer(`${this.user}-rummy-game`, config.peerjs);
    this.addPeerLogging(this.peer);
    this.peer.on("open", () => {
      console.log(`${this.user} peer open`);
      others.forEach((player) => {
        const connection = this.peer.connect(`${player}-rummy-game`);
        if (!this.connectionMap.has(connection.peer)) {
          this.handleConnection(player, connection);
        }
      });
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
          console.log(`user side`);
          this.handleCloseConnection(player, conn);
        });
        this.handleConnection(this.user, connection);
      }
    });
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
      this.handleCloseConnection(player, connection);
    });
    connection.on("error", (err) => {
      console.log(`${player} connection error: `, err);
    });
  }

  handleCloseConnection(player: string, connection: DataConnection) {
    console.log(`${player} connection closed`);
    this.connectionMap.delete(connection.peer);
    this.playerConnection(player, false);
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
      this.usersTurnToEncrypt(data.deckEncryption);
      return;
    }
    if (
      data.dataType == PeerDataType.encryptionKeys &&
      data.encryptionKeys?.to === this.user
    ) {
      this.receivedKeys(data.encryptionKeys);
      return;
    }
    if (
      data.dataType == PeerDataType.keyRequest &&
      data.keyRequest?.to === this.user
    ) {
      this.keyRequestReceived(data.keyRequest);
      return;
    }
  }

  async usersTurnToEncrypt(deckEncryption: DeckEncryption) {
    const encryptedCards = await encryptService.reEncryptDeck(
      deckEncryption.cards
    );
    if (deckEncryption.playerOrder.at(-1) == this.user) {
      if (encryptedCards.length == 52) {
        const table: Table = {
          players: {},
          playerOrder: deckEncryption.playerOrder,
          whoseTurn: deckEncryption.playerOrder[0],
          deck: encryptedCards,
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
      this.table.deck = encryptedCards;
      this.table.pile = [];
      this.sendTableUpdate(this.table);
      this.tableState.update({ table: this.table });
      return;
    }
    const userIndex = deckEncryption.playerOrder.indexOf(this.user);
    const next = deckEncryption.playerOrder[userIndex + 1];
    this.connectionMap.get(`${next}-rummy-game`)?.send({
      dataType: PeerDataType.deckEncryption,
      deckEncryption: {
        to: next,
        cards: encryptedCards,
        playerOrder: deckEncryption.playerOrder,
      },
    });
  }

  async receivedKeys(encryptionKeys: EncryptionKeys) {
    const orderIndex = this.table.playerOrder.indexOf(encryptionKeys.from);
    if (orderIndex === 0) {
      this.cardsDecrypted(encryptionKeys.keys);
      return;
    }
    this.decryptedLayers = await encryptService.decryptLayers(
      this.decryptedLayers,
      encryptionKeys.keys
    );
    let next = this.table.playerOrder[orderIndex - 1];
    if (next == this.user) {
      if (orderIndex === 1) {
        this.cardsDecrypted();
        return;
      }
      this.decryptedLayers = await encryptService.decryptLayers(
        this.decryptedLayers
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
  }

  keyRequestReceived(keyRequest: KeyRequest) {
    this.connectionMap.get(`${keyRequest.from}-rummy-game`)?.send({
      dataType: PeerDataType.encryptionKeys,
      encryptionKeys: {
        from: this.user,
        to: keyRequest.from,
        keys: encryptService.giveKeys(keyRequest.ids),
      },
    });
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

  async initializeDeck(playerOrder?: string[], pile?: Card[]) {
    let order = this.players;
    if (playerOrder) {
      order = playerOrder;
    }
    const deck = pile ? cardsService.shuffle(pile) : cardsService.createDeck();
    const encryptedCards = await encryptService.encryptDeck(deck);
    const next = order[1];
    this.connectionMap.get(`${next}-rummy-game`)?.send({
      dataType: PeerDataType.deckEncryption,
      deckEncryption: {
        to: next,
        cards: encryptedCards,
        playerOrder: order,
      },
    });
  }

  async decryptCards(cardsToDecrypt: EncryptedCard[]) {
    this.decryptedLayers = cardsToDecrypt;
    this.cardsToDecrypt = cardsToDecrypt;
    let player = this.table.playerOrder.at(-1);
    if (player === this.user) {
      this.decryptedLayers = await encryptService.decryptLayers(cardsToDecrypt);
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

  async cardsDecrypted(secrets?: JsonWebKey[]) {
    this.decryptedCardsState.update({
      encryptedCards: this.cardsToDecrypt,
      decryptedCards: await encryptService.decryptCards(
        this.decryptedLayers,
        secrets
      ),
    });
    this.decryptedLayers = [];
    this.cardsToDecrypt = [];
  }

  disconnect() {
    this.connectionMap.forEach((conn) => conn.close());
    this.peer.disconnect();
  }

  addPeerLogging(peer: Peer) {
    peer.on("close", () => {
      console.log(`${this.user} peer closed`);
    });
    peer.on("disconnected", () => {
      console.log(`${this.user} peer disconnected`);
    });
    peer.on("error", (err) => {
      console.log(`${this.user} peer error: `, err);
    });
  }
}
