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
  EndOfGame,
} from "../models";
import { State } from "@veryan/lit-spa";

export interface PeerNetworkHandlers {
  onOpen?: (network: PeerNetwork) => void | Promise<void>;
  onError?: (err: Error) => void;
  onData?: (data: unknown, connection: DataConnection) => void | Promise<void>;
  onOutgoingOpen?: (connection: DataConnection) => void | Promise<void>;
  onIncomingOpen?: (connection: DataConnection) => void | Promise<void>;
  onConnectionClose?: (
    connection: DataConnection,
    kind: "incoming" | "outgoing",
  ) => void;
}

export interface PeerNetworkOptions {
  connectBack?: boolean;
  label?: string;
}

export class PeerNetwork {
  private peer: Peer;
  private connections = new Map<string, DataConnection>();
  private connecting = new Set<string>();
  private incoming = new Set<string>();
  private handlers: PeerNetworkHandlers;
  private connectBack: boolean;
  private label: string;
  private closed = false;

  constructor(
    peerId: string,
    handlers: PeerNetworkHandlers = {},
    options: PeerNetworkOptions = {},
  ) {
    this.handlers = handlers;
    this.connectBack = options.connectBack ?? false;
    this.label = options.label ?? peerId;
    this.peer = new Peer(peerId, config.peerjs);
    this.attachPeerEvents();
  }

  get id(): string {
    return this.peer.id;
  }

  get size(): number {
    return this.connections.size;
  }

  hasConnection(peerId: string): boolean {
    return this.connections.has(peerId) || this.connecting.has(peerId);
  }

  connectTo(
    remotePeerId: string,
    onOpen?: (connection: DataConnection) => void | Promise<void>,
  ): DataConnection | undefined {
    if (this.hasConnection(remotePeerId)) {
      return this.connections.get(remotePeerId);
    }
    this.connecting.add(remotePeerId);
    const connection = this.peer.connect(remotePeerId);
    this.listenToConnection(connection, "outgoing", onOpen);
    return connection;
  }

  send(data: unknown, options?: { excludePeerPrefix?: string }): void {
    this.connections.forEach((connection) => {
      if (
        connection.open &&
        (!options?.excludePeerPrefix ||
          !connection.peer.startsWith(options.excludePeerPrefix))
      ) {
        connection.send(data);
      }
    });
  }

  sendTo(peerId: string, data: unknown): void {
    this.connections.get(peerId)?.send(data);
  }

  disconnect(): void {
    this.closed = true;
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.connecting.clear();
    this.incoming.clear();
    this.peer.disconnect();
  }

  private attachPeerEvents() {
    this.peer.on("open", () => {
      if (this.closed) {
        return;
      }
      console.log(`${this.label} peer open`);
      this.handlers.onOpen?.(this);
    });
    this.peer.on("close", () => {
      console.log(`${this.label} peer closed`);
    });
    this.peer.on("disconnected", () => {
      console.log(`${this.label} peer disconnected`);
    });
    this.peer.on("error", (err) => {
      console.log(`${this.label} peer error: `, err);
      if (this.closed) {
        return;
      }
      this.handlers.onError?.(err);
    });
    this.peer.on("connection", (connection) => {
      if (this.closed || this.incoming.has(connection.peer)) {
        return;
      }
      this.incoming.add(connection.peer);
      console.log(`${connection.peer} connection received by ${this.label}`);
      if (this.connectBack) {
        this.connectTo(connection.peer);
      }
      this.listenToConnection(connection, "incoming");
    });
  }

  private listenToConnection(
    connection: DataConnection,
    kind: "incoming" | "outgoing",
    onOpen?: (connection: DataConnection) => void | Promise<void>,
  ) {
    connection.on("open", () => {
      if (this.closed) {
        return;
      }
      this.connecting.delete(connection.peer);
      if (kind === "outgoing") {
        console.log("queued opened");
        if (!this.connections.has(connection.peer)) {
          this.connections.set(connection.peer, connection);
        }
        this.handlers.onOutgoingOpen?.(connection);
      } else {
        console.log(`${this.label} connection opened`);
        this.handlers.onIncomingOpen?.(connection);
      }
      onOpen?.(connection);
    });
    connection.on("data", (data) => {
      if (this.closed) {
        return;
      }
      this.handlers.onData?.(data, connection);
    });
    connection.on("close", () => {
      if (this.closed) {
        return;
      }
      console.log(`${this.label} connection closed`);
      this.connecting.delete(connection.peer);
      if (kind === "incoming") {
        this.incoming.delete(connection.peer);
      }
      if (this.connections.get(connection.peer) === connection) {
        this.connections.delete(connection.peer);
      }
      this.handlers.onConnectionClose?.(connection, kind);
    });
    connection.on("error", (err) => {
      console.log(`${this.label} connection error: `, err);
      this.connecting.delete(connection.peer);
    });
  }
}

export class PeerController {
  private network: PeerNetwork;
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
  endOfGameState = new State<EndOfGame>();

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
    this.network = new PeerNetwork(
      `${this.user}-rummy-game`,
      {
        onOpen: (network) => {
          others.forEach((player) => {
            network.connectTo(`${player}-rummy-game`, (connection) => {
              if (this.players[0] === this.user && this.table) {
                connection.send({
                  dataType: PeerDataType.table,
                  table: this.table,
                });
              }
            });
          });
        },
        onOutgoingOpen: (connection) => {
          const player = connection.peer.replace(/-rummy-game$/, "");
          this.playerConnection(player, true);
        },
        onIncomingOpen: (connection) => {
          this.playerConnection(this.user, true);
          if (this.players[0] === this.user && this.table) {
            connection.send({
              dataType: PeerDataType.table,
              table: this.table,
            });
          }
        },
        onData: (data) => {
          this.handlePeerData(data as PeerData);
        },
        onConnectionClose: (connection, kind) => {
          const player =
            kind === "incoming"
              ? this.user
              : connection.peer.replace(/-rummy-game$/, "");
          this.playerConnection(player, false);
        },
      },
      { connectBack: true, label: this.user },
    );
  }

  playerConnection(playerName: string, isConnected: boolean) {
    if (
      !this.tableInitializationStarted &&
      this.network.size == this.players.length - 1 &&
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
    if (data.dataType == PeerDataType.endOfGame && data.endOfGame) {
      this.receivedSecretMap(data.endOfGame);
      return;
    }
  }

  async usersTurnToEncrypt(deckEncryption: DeckEncryption) {
    encryptService.incrementSecretMaps();
    const encryptedCards = await encryptService.reEncryptDeck(
      deckEncryption.cards,
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
          (player) => (table.players[player] = new PlayerHand()),
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
    this.network.sendTo(`${next}-rummy-game`, {
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
    const secretMap = new Map<number, JsonWebKey>();
    Object.entries(encryptionKeys.keys).map(([k, v]) =>
      secretMap.set(Number(k), v),
    );
    if (orderIndex === 0) {
      this.cardsDecrypted(secretMap);
      return;
    }
    this.decryptedLayers = await encryptService.decryptLayers(
      this.decryptedLayers,
      secretMap,
    );
    let next = this.table.playerOrder[orderIndex - 1];
    if (next == this.user) {
      if (orderIndex === 1) {
        this.cardsDecrypted();
        return;
      }
      this.decryptedLayers = await encryptService.decryptLayers(
        this.decryptedLayers,
      );
      next = this.table.playerOrder[orderIndex - 2];
    }
    this.network.sendTo(`${next}-rummy-game`, {
      dataType: PeerDataType.keyRequest,
      keyRequest: {
        from: this.user,
        to: next,
        ids: this.decryptedLayers.map((card) => card.id),
      },
    });
  }

  keyRequestReceived(keyRequest: KeyRequest) {
    this.network.sendTo(`${keyRequest.from}-rummy-game`, {
      dataType: PeerDataType.encryptionKeys,
      encryptionKeys: {
        from: this.user,
        to: keyRequest.from,
        keys: encryptService.giveKeys(keyRequest.ids),
      },
    });
  }

  receivedSecretMap(endOfGame: EndOfGame) {
    this.endOfGameState.update(endOfGame);
  }

  sendTableUpdate(table: Table) {
    this.table = table;
    this.network.send(
      {
        dataType: PeerDataType.table,
        table,
      },
      { excludePeerPrefix: this.user },
    );
  }

  async initializeDeck(playerOrder?: string[]) {
    encryptService.resetSecretMaps();
    const deck = cardsService.createDeck();
    return this.initializeDeckEncryption(deck, playerOrder);
  }

  async deckFLipped(playerOrder: string[], pile: Card[]) {
    encryptService.incrementSecretMaps();
    return this.initializeDeckEncryption(
      cardsService.shuffle(pile),
      playerOrder,
    );
  }

  async initializeDeckEncryption(deck: Card[], playerOrder?: string[]) {
    let order = this.players;
    if (playerOrder) {
      order = playerOrder;
    }
    const encryptedCards = await encryptService.encryptDeck(deck);
    const next = order[1];
    this.network.sendTo(`${next}-rummy-game`, {
      dataType: PeerDataType.deckEncryption,
      deckEncryption: {
        to: next,
        cards: encryptedCards,
        playerOrder: order,
      },
    });
    return null;
  }

  async decryptCards(cardsToDecrypt: EncryptedCard[]) {
    this.decryptedLayers = cardsToDecrypt;
    this.cardsToDecrypt = cardsToDecrypt;
    let player = this.table.playerOrder.at(-1);
    if (player === this.user) {
      this.decryptedLayers = await encryptService.decryptLayers(cardsToDecrypt);
      player = this.table.playerOrder.at(-2);
    }
    this.network.sendTo(`${player}-rummy-game`, {
      dataType: PeerDataType.keyRequest,
      keyRequest: {
        from: this.user,
        to: player,
        ids: this.decryptedLayers.map((card) => card.id),
      },
    });
  }

  async cardsDecrypted(secrets?: Map<number, JsonWebKey>) {
    this.decryptedCardsState.update({
      encryptedCards: this.cardsToDecrypt,
      decryptedCards: await encryptService.decryptCards(
        this.decryptedLayers,
        secrets,
      ),
    });
    this.decryptedLayers = [];
    this.cardsToDecrypt = [];
  }

  endOfGame() {
    this.network.send(
      {
        dataType: PeerDataType.endOfGame,
        endOfGame: {
          from: this.user,
          secretMaps: encryptService.secretMaps.map((secretMap) =>
            Object.fromEntries(secretMap),
          ),
        },
      },
      { excludePeerPrefix: this.user },
    );
  }

  disconnect() {
    this.network?.disconnect();
  }
}
