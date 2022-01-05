import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { TranslationController } from "../../controllers/translation.controller";
import { styles } from "./about.styles";

@customElement("app-about")
class About extends LitElement {
  static styles = [styles];

  private i18n = new TranslationController(this);

  render() {
    return html`
      <div class="about-container">
        <div class="about-wrap">
          <div class="about-title">${this.i18n.t("about.rank.title")}</div>
          <span class="about-item">${this.i18n.t("about.rank.text")}</span>
          <div class="about-title">${this.i18n.t("about.goal.title")}</div>
          <span class="about-item">${this.i18n.t("about.goal.text")}</span>
          <div class="about-title">${this.i18n.t("about.play.title")}</div>
          <span class="about-item">${this.i18n.t("about.play.text")}</span>
          <div class="about-title">${this.i18n.t("about.sets.title")}</div>
          <span class="about-item">${this.i18n.t("about.sets.text")}</span>
          <div class="about-title">${this.i18n.t("about.empty.title")}</div>
          <span class="about-item">${this.i18n.t("about.empty.text")}</span>
        </div>
      </div>
    `;
  }
}
