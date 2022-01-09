import { ReactiveControllerHost, noChange, html } from "lit";
import {
  Directive,
  ChildPart,
  DirectiveParameters,
  directive,
  DirectiveResult,
} from "lit/directive.js";
import { classMap } from "lit-html/directives/class-map.js";
import {until} from 'lit/directives/until.js';
import { Toast } from "../models/toast.model";
import { t } from "../services/translate.service";

class ToastDirective extends Directive {
  private toast: Toast;

  update(
    part: ChildPart,
    [toast]: DirectiveParameters<this>
  ) {
    // target element can be accessed from part
    return this.render(toast);
  }

  render(
    toast?: Toast
  ) {
    if (this.toast === toast) {
      return noChange;
    }
    if (!toast) {
      return ""
    }
    this.toast = toast;
    const wait = new Promise((res) => setTimeout(() => res(""), toast.duration));
    const classes = { error: toast.type === "error"}
    return until(wait, html`
    <div class="toast-container">
      <div class="toast ${classMap(classes)}">
        <div class="toast-wrap">
          ${t(toast.key, toast.properties)}
        </div>
      </div>
    </div>`);
  }
}
const toastDirective = directive(ToastDirective);

export class ToastController {
  private host: ReactiveControllerHost;
  private toast: Toast;

  wait(): DirectiveResult<typeof ToastDirective> {
    return toastDirective(this.toast);
  }

  _newToast = (e: CustomEvent) => {
    const toast: Toast = e.detail;
    if (this.toast !== toast) {
      this.toast = toast;
      this.host.requestUpdate();
    }
  }

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected() : void {
    window.addEventListener(
      "toast",
      this._newToast as EventListener
    );
  }

  hostDisconnected(): void {
    window.removeEventListener(
      "toast",
      this._newToast as EventListener
    );
  }
}
