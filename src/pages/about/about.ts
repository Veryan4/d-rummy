import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { TranslationController } from "../../controllers";
import { styles } from "./about.styles";
import "../../components/tooltip/tooltip";

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
          <div class="about-title">${this.i18n.t("about.open_source.title")}</div>
          <span class="about-item">
            <a href="https://github.com/Veryan4/d-rummy" target="_blank">
              https://github.com/Veryan4/d-rummy
            </a>
          </span>
        </div>
      </div>
    `;
  }
}
