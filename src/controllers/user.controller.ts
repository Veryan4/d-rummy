import { ReactiveControllerHost } from "lit";
import { userService } from "../services/user.service";

export class UserController {
  private host: ReactiveControllerHost;
  value = userService.user();

  _changeUser = (e: CustomEvent) => {
    if (this.value !== userService.user()) {
      this.value = userService.user();
      this.host.requestUpdate();
    }
  };

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected(): void {
    window.addEventListener("user-update", this._changeUser as EventListener);
  }

  hostDisconnected(): void {
    window.removeEventListener(
      "user-update",
      this._changeUser as EventListener
    );
  }
}
