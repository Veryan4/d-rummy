import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { styles } from "./tooltip.styles";

@customElement("tool-tip")
class ToolTipComponent extends LitElement {
  static styles = [styles];

  @property({ type: String })
  text: string;

  @property({ type: String })
  position: "top" | "bottom" | "right" | "left";

  constructor() {
    super();
  }

  render() {
    return html`
      <div class="tooltip">
        <span class="tooltiptext ${this.position}">${this.text}</span>
        <slot></slot>
      </div>
    `;
  }
}
