import { ReactiveControllerHost } from "lit";
import { themeService } from "../services";

export class ThemeController {
  private host: ReactiveControllerHost;
  value = themeService.getTheme();

  _changeTheme = (e: CustomEvent) => {
    if (this.value !== themeService.getTheme()) {
      this.value = themeService.getTheme();
      this.host.requestUpdate();
    }
  };

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected() {
    window.addEventListener(
      themeService.THEME_EVENT,
      this._changeTheme as EventListener
    );
  }

  hostDisconnected() {
    window.removeEventListener(
      themeService.THEME_EVENT,
      this._changeTheme as EventListener
    );
  }
}
