import { ReactiveControllerHost } from "lit";
import { userService } from "../services";

export class UserController {
  private host: ReactiveControllerHost;
  private unsubscribe?: () => boolean;
  value = userService.getUser();

  _changeUser = (user: string | null) => {
    if (this.value !== user) {
      this.value = user;
      this.host.requestUpdate();
    }
  };

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected(): void {
    this.unsubscribe = userService.state.subscribe((user) =>
      this._changeUser(user)
    );
  }

  hostDisconnected(): void {
    this.unsubscribe?.();
  }
}
