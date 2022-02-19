import { ReactiveControllerHost, noChange, html } from "lit";
import {
  Directive,
  ChildPart,
  DirectiveParameters,
  directive,
  DirectiveResult,
} from "lit/directive.js";
import { toastService } from "../services";
import { Toast } from "../models";
import "../components/toast/toast";

class ToastDirective extends Directive {
  private toast: Toast;

  update(part: ChildPart, [toast]: DirectiveParameters<this>) {
    // target element can be accessed from part
    return this.render(toast);
  }

  render(toast?: Toast) {
    if (this.toast === toast) {
      return noChange;
    }
    if (!toast) {
      return "";
    }
    this.toast = toast;
    return html`<app-toast .toast=${toast}></app-toast>`;
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
  };

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected(): void {
    window.addEventListener(
      toastService.TOAST_EVENT,
      this._newToast as EventListener
    );
  }

  hostDisconnected(): void {
    window.removeEventListener(
      toastService.TOAST_EVENT,
      this._newToast as EventListener
    );
  }
}
