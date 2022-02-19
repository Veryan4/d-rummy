import { ReactiveControllerHost } from "lit";
import { userService } from "../services";

export class UserController {
  private host: ReactiveControllerHost;
  value = userService.getUser();

  _changeUser = (e: Event) => {
    if (this.value !== userService.getUser()) {
      this.value = userService.getUser();
      this.host.requestUpdate();
    }
  };

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected(): void {
    window.addEventListener(
      userService.USER_EVENT,
      this._changeUser as EventListener
    );
  }

  hostDisconnected(): void {
    window.removeEventListener(
      userService.USER_EVENT,
      this._changeUser as EventListener
    );
  }
}
