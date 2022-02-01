import { LitElement, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { classMap } from "lit-html/directives/class-map.js";
import { SymbolType, RankType } from "../../models/cards.model";
import { cardStyles } from "./game-card.styles";

@customElement("game-card")
class GameCardComponent extends LitElement {
  static styles = [cardStyles];

  static get is() {
    return "game-card";
  }

  /* Spade character ♠ */
  static get SPADE() {
    return "♠";
  }

  /* Heart character ♥ */
  static get HEART() {
    return "♥";
  }

  /* Club character ♣ */
  static get CLUB() {
    return "♣";
  }

  /* Diamond character ♦ */
  static get DIAMOND() {
    return "♦";
  }

  /* Symbols names indexed by `symbol` (character) */
  static get SYMBOLS() {
    return {
      "♠": "spade",
      "♥": "heart",
      "♣": "club",
      "♦": "diamond",
    };
  }

  /* Rank names indexed by `rank` */
  static get RANKS() {
    return {
      a: "ace",
      "2": "two",
      "3": "three",
      "4": "four",
      "5": "five",
      "6": "six",
      "7": "seven",
      "8": "height",
      "9": "nine",
      "10": "ten",
      j: "jack",
      q: "queen",
      k: "king",
    };
  }

  /* List of figures among ranks */
  static get FIGURES() {
    return ["j", "q", "k"];
  }

  static get COLOR_CLASSES() {
    return {
      "♠": "black",
      "♥": "red",
      "♣": "black",
      "♦": "red",
    };
  }

  static get CLASS_MATRIX() {
    return [
      ["h-centered v-centered"],
      ["h-centered top", null, null, null, null, "h-centered bottom"],
      [
        "h-centered top",
        "h-centered v-centered",
        null,
        null,
        null,
        "h-centered bottom",
      ],
      [
        "top left",
        "top right",
        null,
        null,
        null,
        "bottom left",
        "bottom right",
      ],
      [
        "top left",
        "top right",
        "h-centered v-centered",
        null,
        null,
        "bottom left",
        "bottom right",
      ],
      [
        "top left",
        "top right",
        "v-centered left",
        "v-centered right",
        null,
        "bottom left",
        "bottom right",
      ],
      [
        "top left",
        "top right",
        "v-centered left",
        "v-centered right",
        "h-centered near-top",
        "bottom left",
        "bottom right",
      ],
      [
        "top left",
        "top right",
        "far-top left",
        "far-top right",
        null,
        "far-bottom left",
        "far-bottom right",
        "bottom left",
        "bottom right",
      ],
      [
        "top left",
        "top right",
        "far-top left",
        "far-top right",
        "h-centered near-top",
        "far-bottom left",
        "far-bottom right",
        "bottom left",
        "bottom right",
      ],
      [
        "top left",
        "top right",
        "far-top left",
        "far-top right",
        "h-centered near-top",
        "far-bottom left",
        "far-bottom right",
        "bottom left",
        "bottom right",
        "h-centered near-bottom",
      ],
    ];
  }

  @property({ type: String, reflect: true })
  symbol: SymbolType = "♠";

  @property({ type: String, reflect: true })
  rank: RankType = "a";

  @property({ type: Boolean, reflect: true })
  unrevealed = false;

  @property({ type: Boolean, reflect: true })
  flippable = false;

  @property({ type: Boolean, reflect: true })
  selected = false;

  @query("#container")
  container: HTMLElement;

  constructor() {
    super();
  }

  flip(e: Event) {
    e.preventDefault();
    if (this.flippable) {
      this.unrevealed = !this.unrevealed;
    }
  }

  upper(token: string) {
    return token ? token.toUpperCase() : "";
  }

  _computePositionClass(index: number, suffix: string, rank: RankType) {
    const klass =
      GameCardComponent.CLASS_MATRIX[rank.toLowerCase() === "a" ? 0 : Number(rank) - 1];
    const subKlass = klass && klass[index];

    return `${subKlass ? subKlass : "hidden"} ${suffix}`;
  }

  _computeColorClass(symbol: SymbolType) {
    return GameCardComponent.COLOR_CLASSES[symbol];
  }

  _computeFigureImage(rank: RankType, symbol: SymbolType) {
    const rankName =
      GameCardComponent.FIGURES.indexOf(rank.toLowerCase()) != -1 &&
      GameCardComponent.RANKS[rank.toLowerCase() as RankType],
      symbolName = GameCardComponent.SYMBOLS[symbol];

    return rankName && symbolName
      ? `./cards/${rankName}_of_${symbolName}s_fr.svg`
      : "";
  }

  render() {
    const classes = { selected: this.selected };
    return html`
      <div
        id="container"
        class="${this._computeColorClass(this.symbol)}"
        @click=${this.flip}
      >
        <div id="front" class="${classMap(classes)}">
          <span class="rank"
            >${this.upper(this.rank)}<br /><span class="rank-symbol"
              >${this.symbol}</span
            ></span
          >
          <span class="rank reversed"
            >${this.upper(this.rank)}<br /><span class="rank-symbol"
              >${this.symbol}</span
            ></span
          >
          <span class="${this._computePositionClass(0, "symbol", this.rank)}"
            >${this.symbol}</span
          >
          <span class="${this._computePositionClass(1, "symbol", this.rank)}"
            >${this.symbol}</span
          >
          <span class="${this._computePositionClass(2, "symbol", this.rank)}"
            >${this.symbol}</span
          >
          <span class="${this._computePositionClass(3, "symbol", this.rank)}"
            >${this.symbol}</span
          >
          <span class="${this._computePositionClass(4, "symbol", this.rank)}"
            >${this.symbol}</span
          >
          <span
            class="${this._computePositionClass(
              5,
              "reversed symbol",
              this.rank
            )}"
            >${this.symbol}</span
          >
          <span
            class="${this._computePositionClass(
              6,
              "reversed symbol",
              this.rank
            )}"
            >${this.symbol}</span
          >
          <span
            class="${this._computePositionClass(
              7,
              "reversed symbol",
              this.rank
            )}"
            >${this.symbol}</span
          >
          <span
            class="${this._computePositionClass(
              8,
              "reversed symbol",
              this.rank
            )}"
            >${this.symbol}</span
          >
          <span
            class="${this._computePositionClass(
              9,
              "reversed symbol",
              this.rank
            )}"
            >${this.symbol}</span
          >
          <img
            class="figure"
            @click=${(e: Event) => e.preventDefault()}
            src="${this._computeFigureImage(this.rank, this.symbol)}"
          />
        </div>
        <div id="back" class="${classMap(classes)}">
          <div id="back-draw"></div>
        </div>
      </div>
    `;
  }
}

export class GameCard extends GameCardComponent{}