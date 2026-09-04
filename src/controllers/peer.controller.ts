import {
  cardsService,
  encryptService,
  storeService,
  userService,
} from "../services";
import Peer, { DataConnection } from "peerjs";
import { config } from "../app.config";
import {
  Card,
  DeckEncryption,
  DeckPurpose,
  DeckSeed,
  EncryptionKeys,
  GameId,
  KeyRequest,
  PeerData,
  PeerDataType,
  PlayerHand,
  Table,
  EncryptedCard,
  EndOfGame,
} from "../models";
import { State } from "@veryan/lit-spa";
import { getGame } from "../games/registry";
import { gamePeerId, playerFromGamePeer } from "../games/peer-ids";
import { isDeckDealer, nextEncryptHop } from "../games/deck-protocol";

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
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.connecting.clear();
    this.incoming.clear();
    this.peer.destroy();
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
  private gameId: GameId;
  private namespace: string;

  tableState = new State<{ table: Table }>();
  connectionState = new State<{ playerName: string; isConnected: boolean }>();
  decryptedCardsState = new State<{
    decryptedCards: Card[];
    encryptedCards: EncryptedCard[];
  }>();
  endOfGameState = new State<EndOfGame>();

  constructor(players: string[], table?: Table, gameId?: GameId) {
    if (table) {
      this.table = table;
    }
    this.gameId = getGame(
      gameId ?? table?.gameId ?? storeService.getGameType(),
    ).id;
    this.namespace = getGame(this.gameId).peerNamespace;
    this.players = players;
    if (this.players.length > 0) {
      this.setupNTwoWayPeerConnections();
    }
  }

  private peerIdFor(user: string): string {
    return gamePeerId(user, this.namespace);
  }

  setupNTwoWayPeerConnections() {
    const others = this.players.filter((player) => player != this.user);
    this.network = new PeerNetwork(
      this.peerIdFor(this.user),
      {
        onOpen: (network) => {
          others.forEach((player) => {
            network.connectTo(this.peerIdFor(player), (connection) => {
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
          const player = playerFromGamePeer(connection.peer, this.namespace);
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
              : playerFromGamePeer(connection.peer, this.namespace);
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
    if (data.dataType == PeerDataType.rematch && data.rematch) {
      this.receivedRematch(data.rematch.playerOrder);
      return;
    }
    if (
      data.dataType == PeerDataType.deckSeed &&
      data.deckSeed?.to === this.user
    ) {
      await this.receivedDeckSeed(data.deckSeed);
      return;
    }
  }

  async usersTurnToEncrypt(deckEncryption: DeckEncryption) {
    encryptService.incrementSecretMaps();
    const encryptedCards = await encryptService.reEncryptDeck(
      deckEncryption.cards,
    );
    if (deckEncryption.playerOrder.at(-1) == this.user) {
      const purpose: DeckPurpose =
        deckEncryption.purpose ??
        (encryptedCards.length == 52 ? "initial" : "recycle");
      const gameId = deckEncryption.gameId ?? this.gameId;
      if (purpose === "initial") {
        const table: Table = {
          gameId,
          players: {},
          playerOrder: deckEncryption.playerOrder,
          whoseTurn: deckEncryption.playerOrder[0],
          deck: encryptedCards,
          pile: [],
          hasDrawn: false,
          turn: 0,
        };
        if (gameId === "crazy-eights") {
          table.crazyEights = {
            currentSuit: "♠",
            direction: 1,
            pendingDraw: 0,
          };
        }
        this.players.forEach(
          (player) => (table.players[player] = new PlayerHand()),
        );
        this.sendTableUpdate(table);
        this.tableState.update({ table });
        return;
      }
      this.table.deck = encryptedCards;
      this.table.pile = deckEncryption.retainedPile ?? [];
      this.sendTableUpdate(this.table);
      this.tableState.update({ table: this.table });
      return;
    }
    const next = nextEncryptHop(this.user, deckEncryption.playerOrder);
    if (!next) {
      return;
    }
    this.network.sendTo(this.peerIdFor(next), {
      dataType: PeerDataType.deckEncryption,
      deckEncryption: {
        to: next,
        cards: encryptedCards,
        playerOrder: deckEncryption.playerOrder,
        gameId: deckEncryption.gameId ?? this.gameId,
        purpose: deckEncryption.purpose,
        retainedPile: deckEncryption.retainedPile,
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
    this.network.sendTo(this.peerIdFor(next), {
      dataType: PeerDataType.keyRequest,
      keyRequest: {
        from: this.user,
        to: next,
        ids: this.decryptedLayers.map((card) => card.id),
      },
    });
  }

  keyRequestReceived(keyRequest: KeyRequest) {
    this.network.sendTo(this.peerIdFor(keyRequest.from), {
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
    const order = playerOrder ?? this.players;
    if (!isDeckDealer(this.user, order)) {
      return null;
    }
    encryptService.resetSecretMaps();
    const deck = cardsService.createDeck();
    return this.initializeDeckEncryption(deck, order, "initial");
  }

  requestRematch(playerOrder: string[]) {
    this.network.send(
      {
        dataType: PeerDataType.rematch,
        rematch: { playerOrder },
      },
      { excludePeerPrefix: this.user },
    );
    if (isDeckDealer(this.user, playerOrder)) {
      void this.initializeDeck(playerOrder);
    }
  }

  private receivedRematch(playerOrder: string[]) {
    if (isDeckDealer(this.user, playerOrder)) {
      void this.initializeDeck(playerOrder);
    }
  }

  async deckFLipped(playerOrder: string[], pile: Card[]) {
    return this.initializeDeckEncryption(
      cardsService.shuffle(pile),
      playerOrder,
      "recycle",
      [],
    );
  }

  async recycleDeck(
    playerOrder: string[],
    cards: Card[],
    retainedPile: Card[],
  ) {
    return this.initializeDeckEncryption(
      cardsService.shuffle(cards),
      playerOrder,
      "recycle",
      retainedPile,
    );
  }

  private async receivedDeckSeed(seed: DeckSeed) {
    if (seed.purpose === "recycle") {
      encryptService.incrementSecretMaps();
    } else {
      encryptService.resetSecretMaps();
    }
    return this.encryptAndForward(
      seed.cards,
      seed.playerOrder,
      seed.purpose ?? "recycle",
      seed.retainedPile,
      seed.gameId,
    );
  }

  async initializeDeckEncryption(
    deck: Card[],
    playerOrder?: string[],
    purpose: DeckPurpose = "initial",
    retainedPile?: Card[],
  ) {
    const order = playerOrder ?? this.players;
    if (!isDeckDealer(this.user, order)) {
      this.network.sendTo(this.peerIdFor(order[0]), {
        dataType: PeerDataType.deckSeed,
        deckSeed: {
          to: order[0],
          cards: deck,
          playerOrder: order,
          gameId: this.gameId,
          purpose,
          retainedPile,
        },
      });
      return null;
    }
    if (purpose === "recycle") {
      encryptService.incrementSecretMaps();
    }
    return this.encryptAndForward(
      deck,
      order,
      purpose,
      retainedPile,
      this.gameId,
    );
  }

  private async encryptAndForward(
    deck: Card[],
    order: string[],
    purpose: DeckPurpose,
    retainedPile: Card[] | undefined,
    gameId?: GameId,
  ) {
    const encryptedCards = await encryptService.encryptDeck(deck);
    const next = nextEncryptHop(this.user, order);
    if (!next) {
      return null;
    }
    this.network.sendTo(this.peerIdFor(next), {
      dataType: PeerDataType.deckEncryption,
      deckEncryption: {
        to: next,
        cards: encryptedCards,
        playerOrder: order,
        gameId: gameId ?? this.gameId,
        purpose,
        retainedPile,
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
    if (!player) {
      return;
    }
    this.network.sendTo(this.peerIdFor(player), {
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
