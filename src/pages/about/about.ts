import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { TranslationController } from "@veryan/lit-spa";
import { styles } from "./about.styles";
import { storeService } from "../../services";
import { GameId } from "../../models";

const RUMMY_SECTIONS = ["rank", "goal", "play", "sets", "empty"];
const EIGHTS_SECTIONS = [
  "rank",
  "goal",
  "play",
  "eights",
  "queen",
  "ace",
  "twos",
  "upcard",
  "empty",
];

const GAME_SECTIONS: Record<GameId, string[]> = {
  rummy: RUMMY_SECTIONS,
  "crazy-eights": EIGHTS_SECTIONS,
};

const GAME_TITLE_KEY: Record<GameId, string> = {
  rummy: "games.rummy",
  "crazy-eights": "games.crazyEights",
};

@customElement("app-about")
class About extends LitElement {
  static styles = [styles];

  @property({ type: Boolean, reflect: true })
  compact = false;

  private i18n = new TranslationController(this);

  render() {
    const selected = storeService.getGameType();
    const games: GameId[] = selected ? [selected] : ["crazy-eights", "rummy"];
    return html`
      <div class="about-container">
        <div class="about-wrap">
          <div class="about-title">${this.i18n.t("about.app.title")}</div>
          <span class="about-item">${this.i18n.t("about.app.text")}</span>
          ${games.map((gameId) => this.renderGameRules(gameId, !selected))}
          <div class="about-title">
            ${this.i18n.t("about.open_source.title")}
          </div>
          <span class="about-item">
            <a href="https://github.com/Veryan4/d-rummy" target="_blank">
              https://github.com/Veryan4/d-rummy
            </a>
          </span>
        </div>
      </div>
    `;
  }

  private renderGameRules(
    gameId: GameId,
    showHeading: boolean,
  ): TemplateResult {
    const prefix = `about.${gameId}`;
    return html`
      ${showHeading
        ? html`<div class="about-sub-title">
            ${this.i18n.t(GAME_TITLE_KEY[gameId])}
          </div>`
        : ""}
      ${GAME_SECTIONS[gameId].map(
        (section) => html`
          <div class="about-title">
            ${this.i18n.t(`${prefix}.${section}.title`)}
          </div>
          <span class="about-item"
            >${this.i18n.t(`${prefix}.${section}.text`)}</span
          >
        `,
      )}
    `;
  }
}
