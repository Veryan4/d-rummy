import { LitElement } from "lit";
import { PeerController } from "../controllers";
import {
  auditService,
  cardsService,
  encryptService,
  storeService,
  tableService,
} from "../services";
import { routerService, toastService } from "@veryan/lit-spa";
import {
  Card,
  CheatEnum,
  EncryptedCard,
  EndOfGame,
  GameId,
  Table,
} from "../models";
import { getGame } from "./registry";

export type DecryptPurpose = "hand" | "upcard" | "penalty";

export interface GameSessionHooks {
  isGameOver: (table: Table) => string | null;
  dealInitialCards: (table: Table, user: string) => EncryptedCard[] | null;
  cheatDetection: (table: Table, lastTable: Table) => CheatEnum | null;
  shouldDeal: (table: Table) => boolean;
  shouldCheatCheck: (previous: Table, next: Table) => boolean;
  shouldFoldSnapshot?: (last: Table, next: Table) => boolean;
  shouldPlayTurnSound: (table: Table) => boolean;
  shouldToastYourTurn: (table: Table, user: string) => boolean;
  getNextRematchPlayerOrder: (order: string[]) => string[];
  yourTurnKey?: string;
  onDecrypted?: (
    session: GameSession,
    data: { decryptedCards: Card[]; encryptedCards: EncryptedCard[] },
  ) => boolean;
  afterApply?: (session: GameSession, previous: Table) => void;
  onUnselectAll?: () => void;
  onHandChanged?: (hand: Card[]) => void;
}

export class GameSession {
  peerController: PeerController;
  table: Table;
  myHand: Card[] = [];
  decryptedMap = new Map<number, string>();
  tableOverTime: Table[] = [];
  players: string[] = [];
  others: string[] = [];
  winner: string | null = null;
  cheat: CheatEnum | null = null;
  isAuditEnabled = false;
  infractionFound = false;
  decryptPurpose: DecryptPurpose = "hand";
  upcardRequested = false;
  penaltyAfterRecycle = false;
  recycleInFlight = false;

  private debounceInterval = 150;
  private timer: number;
  private pendingPeerTable: Table | undefined;
  private peerTableTail: Promise<void> = Promise.resolve();
  private subscriptions: (() => boolean)[] = [];
  private playersSecretKeys = new Map<string, Map<number, JsonWebKey>[]>();

  constructor(
    private host: LitElement,
    public user: string,
    private hooks: GameSessionHooks,
    private sound: { play: (audio: HTMLAudioElement) => void },
    private turnSounds: { yours: HTMLAudioElement; theirs: HTMLAudioElement },
    gameId?: GameId,
  ) {
    const {
      players,
      table,
      hand,
      decryptedMap,
      tableOverTime,
      decryptedTablesOverTime,
    } = storeService.getGameState();
    this.table = tableService.createInitialTable(user);
    if (players) {
      this.players = players;
      this.others = this.players.filter((player) => player != user);
      if (table) {
        this.table = table;
        this.myHand = hand ?? [];
        this.decryptedMap = decryptedMap ?? new Map();
        this.tableOverTime = tableOverTime ?? [];
      }
      if (decryptedTablesOverTime) {
        this.isAuditEnabled = true;
      }
      this.peerController = new PeerController(
        this.players,
        this.table,
        gameId ?? this.table.gameId ?? storeService.getGameType() ?? undefined,
      );
      this.subscriptions = [
        this.peerController.tableState.subscribe((data) =>
          this.handlePeerTable(data),
        ),
        this.peerController.connectionState.subscribe((data) =>
          this.playerConnection(data),
        ),
        this.peerController.decryptedCardsState.subscribe((data) =>
          this.decryptCards(data),
        ),
        this.peerController.endOfGameState.subscribe((data) =>
          this.receivedEndOfGame(data),
        ),
      ];
      if (table) {
        this.restoreTable();
      }
    }
  }

  disconnect() {
    this.subscriptions.forEach((s) => s());
    this.peerController?.disconnect();
  }

  private handlePeerTable(data: { table: Table }) {
    const incoming = data.table;
    if (
      this.pendingPeerTable &&
      (incoming.turn !== this.pendingPeerTable.turn ||
        !cardsService.areTablesEqual(this.pendingPeerTable, incoming))
    ) {
      clearTimeout(this.timer);
      const previous = this.pendingPeerTable;
      this.pendingPeerTable = incoming;
      this.queueApplyPeerTable(previous);
      this.schedulePeerTableFlush();
      return;
    }
    this.pendingPeerTable = incoming;
    this.schedulePeerTableFlush();
  }

  private schedulePeerTableFlush() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const table = this.pendingPeerTable;
      this.pendingPeerTable = undefined;
      if (table) {
        this.queueApplyPeerTable(table);
      }
    }, this.debounceInterval);
  }

  private queueApplyPeerTable(table: Table) {
    this.peerTableTail = this.peerTableTail
      .catch(() => undefined)
      .then(() => this.applyPeerTable(table));
  }

  private async applyPeerTable(table: Table) {
    if (!cardsService.areTablesEqual(this.table, table)) {
      await this.updateTable(table, true);
    }
  }

  async playerConnection(data: { playerName: string; isConnected: boolean }) {
    if (!data.isConnected) {
      if (this.hooks.isGameOver(this.table)) {
        setTimeout(() => {
          if (!this.table.players[data.playerName].connected) {
            this.returnToLobby();
          }
        }, 5000);
      }
    }
    if (this.table.players[data.playerName]) {
      this.table.players[data.playerName].connected = data.isConnected;
      this.host.requestUpdate();
    }
  }

  async restoreTable(): Promise<void> {
    this.updateTable(this.table);
    this.host.requestUpdate();
    await this.host.updateComplete;
    this.hooks.onHandChanged?.(this.myHand);
  }

  async sendTableUpdate(): Promise<void> {
    this.updateTable(this.table);
    this.peerController.sendTableUpdate(structuredClone(this.table));
    this.host.requestUpdate();
    await this.host.updateComplete;
    this.hooks.onHandChanged?.(this.myHand);
  }

  async updateTable(table: Table, updateByOther?: boolean) {
    const previous = this.table;
    if (table.turn < this.table.turn && table.turn !== 0) {
      return;
    }

    const lastRecorded = this.tableOverTime.at(-1);
    if (
      lastRecorded &&
      this.table.turn > lastRecorded.turn &&
      !cardsService.areTablesEqual(lastRecorded, this.table)
    ) {
      this.tableOverTime.push(structuredClone(this.table));
    }

    if (this.hooks.shouldCheatCheck(this.table, table)) {
      const cheat = this.hooks.cheatDetection(
        table,
        this.tableOverTime.at(-1)!,
      );
      if (cheat != null) {
        this.cheat = cheat;
        toastService.newError("audit.cheat." + cheat);
        this.peerController.endOfGame();
        this.hooks.onUnselectAll?.();
        this.host.requestUpdate();
        return;
      }
    }

    if (this.hooks.shouldDeal(table)) {
      if (this.table.turn !== 0) {
        this.beginNewDeal();
      }
      this.table = table;
      this.tableOverTime = [structuredClone(table)];
      this.dealInitialCards(table);
    }

    if (updateByOther) {
      this.recordSnapshot(table);
      this.table = table;
      this.host.requestUpdate();
    } else {
      this.recordSnapshot(table);
    }
    storeService.setTable(table);
    storeService.setTableOverTime(this.tableOverTime);

    if (this.hooks.shouldPlayTurnSound(table)) {
      if (table.whoseTurn === this.user) {
        this.sound.play(this.turnSounds.yours);
      } else {
        this.sound.play(this.turnSounds.theirs);
      }
    }

    this.winner = this.hooks.isGameOver(this.table);
    if (this.winner) {
      this.peerController.endOfGame();
      this.hooks.onUnselectAll?.();
    }

    if (this.hooks.shouldToastYourTurn(table, this.user)) {
      toastService.newToast(this.hooks.yourTurnKey ?? "rummy.you");
    }

    this.hooks.afterApply?.(this, previous);
  }

  recordSnapshot(table: Table) {
    if (table.turn === 0) {
      return;
    }
    const last = this.tableOverTime.at(-1);
    if (last && this.hooks.shouldFoldSnapshot?.(last, table)) {
      this.tableOverTime[this.tableOverTime.length - 1] = structuredClone(table);
      return;
    }
    if (!last || !cardsService.areTablesEqual(last, table)) {
      this.tableOverTime.push(structuredClone(table));
    }
  }

  dealInitialCards(table: Table) {
    const cardsToDecrypt = this.hooks.dealInitialCards(table, this.user);
    if (cardsToDecrypt) {
      this.myHand = [];
      this.decryptPurpose = "hand";
      this.peerController.decryptCards(cardsToDecrypt);
    }
  }

  decryptCards(data: {
    decryptedCards: Card[];
    encryptedCards: EncryptedCard[];
  }) {
    if (this.hooks.onDecrypted?.(this, data)) {
      return;
    }
    const { newHand } = tableService.addEncryptedCardsToHand(
      this.table,
      this.user,
      this.myHand,
      this.decryptedMap,
      data.encryptedCards,
      data.decryptedCards,
    );
    this.myHand = newHand;
    this.sendTableUpdate();
  }

  private beginNewDeal() {
    this.decryptedMap.clear();
    this.myHand = [];
    this.winner = null;
    this.cheat = null;
    this.playersSecretKeys.clear();
    this.isAuditEnabled = false;
    this.infractionFound = false;
    this.upcardRequested = false;
    this.penaltyAfterRecycle = false;
    this.recycleInFlight = false;
    this.decryptPurpose = "hand";
  }

  rematch() {
    const playerOrder = this.hooks.getNextRematchPlayerOrder(
      this.table.playerOrder,
    );
    this.peerController.requestRematch(playerOrder);
  }

  returnToLobby() {
    storeService.eraseGameState();
    routerService.navigate("/");
  }

  async receivedEndOfGame(endOfGame: EndOfGame) {
    const secretMaps = endOfGame.secretMaps.map((secretMap) => {
      const map = new Map<number, JsonWebKey>();
      Object.entries(secretMap).map(([k, v]) => map.set(Number(k), v));
      return map;
    });
    this.playersSecretKeys.set(endOfGame.from, secretMaps);
    if (this.playersSecretKeys.size == this.players.length - 1) {
      this.playersSecretKeys.set(this.user, encryptService.secretMaps);
      try {
        const { audit, decryptedTablesOverTime } = await auditService.audit(
          this.tableOverTime,
          this.playersSecretKeys,
        );
        storeService.setDecryptedTableOverTime(decryptedTablesOverTime);
        storeService.setAudit(audit);
        if (audit.some((a) => a.infractions.length)) {
          this.infractionFound = true;
        }
      } catch (error) {
        console.error("Failed to decrypt game for audit", error);
      }
      this.isAuditEnabled = true;
      this.host.requestUpdate();
    }
  }

  sendToAudit() {
    window.open(location.origin + "/audit", "_blank", "noreferrer");
  }

  isYourTurn(): boolean {
    return tableService.isYourTurn(this.table, this.user);
  }

  get definition() {
    return getGame(this.table.gameId ?? storeService.getGameType());
  }
}
