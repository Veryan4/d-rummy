import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit-html/directives/class-map.js";
import { until } from "lit/directives/until.js";
import { Toast } from "../../models";
import { translateService } from "../../services";
import { styles } from "./toast.styles";

@customElement("app-toast")
class ToastComponent extends LitElement {
  static styles = [styles];

  @property({ type: Object })
  toast: Toast;

  constructor() {
    super();
  }

  render() {
    const wait = new Promise((res) =>
      setTimeout(() => res(""), this.toast.duration)
    );
    const classes = { error: this.toast.type === "error" };
    return until(
      wait,
      html` <div class="toast-container">
        <div class="toast ${classMap(classes)}">
          <div class="toast-wrap">
            ${translateService.t(this.toast.key, this.toast.properties)}
          </div>
        </div>
      </div>`
    );
  }
}
