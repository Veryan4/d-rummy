import { LitElement, html, svg } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit-html/directives/class-map.js";
import { SymbolType, RankType } from "../../models/cards.model";
import { cardStyles } from "./game-card.styles";

@customElement("game-card")
class GameCardComponent extends LitElement {
  static styles = [cardStyles];

  faces: RankType[] = ["j", "q", "k"];

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

  flip(e: Event) {
    e.preventDefault();
    if (this.flippable) {
      this.unrevealed = !this.unrevealed;
    }
  }

  render() {
    const classes = { 
      selected: this.selected,
      red: this.symbol =="♥" || this.symbol == "♦",
      black: this.symbol == "♠" || this.symbol == "♣",
    };
    return html`
      <div
        class="container ${classMap(classes)}"
        @click=${this.flip}
      >
        <div id="front" class="${classMap(classes)}">
          ${this.renderAlphaNumRank()}
          ${this.renderAlphaNumRank(true)}
          ${this.renderRank()}
          <img
            class="figure"
            @click=${(e: Event) => e.preventDefault()}
            src="${this.getFigureImage()}"
          />
        </div>
        <div id="back" class="${classMap(classes)}">
          <div id="back-draw"></div>
        </div>
      </div>
    `;
  }

  renderAlphaNumRank(reversed = false) {
    const classes = { reversed };
    return html`
    <span class="rank ${classMap(classes)}">
      ${this.renderTextSVG(this.rank?.toUpperCase(), 20)}
      ${this.renderTextSVG(this.symbol, 20)}
    </span>`;
  }


  renderTextSVG(content: string, size: number) {
    return svg`
    <svg viewBox="0 0 ${size} ${size}">
      <text x="50%" y="95%" font-size=${size} text-anchor="middle">${content}</text>
    </svg>`;
  }

  renderRank() {
    if (this.faces.includes(this.rank)) {
      return ""
    }
    const rankClassMap =[
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
    ]

    return [...Array(10).keys()].map((i) => {
      const rankClasses =
        rankClassMap[
          this.rank.toLowerCase() === "a" ? 0 : Number(this.rank) - 1
        ];
      const indexClass = rankClasses && rankClasses[i];
      const classes = {
        reversed: i >= 5,
        [indexClass ?? "hidden"]: true
      }
      return html`
        <span class="symbol ${classMap(classes)}">
          ${this.renderTextSVG(this.symbol, 12)}
        </span>`
    });
  }

  getFigureImage() {
    if (!this.faces.includes(this.rank)) {
      return ""
    }
    const symbolNames = {
      "♠": "spade",
      "♥": "heart",
      "♣": "club",
      "♦": "diamond"
    }
    const rankNames = {
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
      k: "king"
    }
    const rankName = rankNames[this.rank.toLowerCase() as RankType];
    const symbolName = symbolNames[this.symbol];

    return rankName && symbolName
      ? `./cards/${rankName}_of_${symbolName}s.svg`
      : "";
  }
}

export class GameCard extends GameCardComponent {}
