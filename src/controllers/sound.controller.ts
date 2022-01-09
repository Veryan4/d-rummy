import { ReactiveControllerHost } from "lit";

export class SoundController {
  private host: ReactiveControllerHost;
  value = localStorage.getItem('sound-on') ? true : false;
  soundPlaying = false

  _changeSound = (e: CustomEvent) => {
    if (this.value) {
      this.value = false;
      localStorage.removeItem('sound-on') 
    } else {
      this.value = true;
      localStorage.setItem('sound-on', 'on')
    }
    this.host.requestUpdate();
  };

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  play(sound: HTMLAudioElement): void {
    if (!this.soundPlaying && this.value){
      this.soundPlaying = true;
      sound.play().then(() => this.soundPlaying = false);
    }
  }

  hostConnected(): void {
    window.addEventListener("sound-update", this._changeSound as EventListener);
  }

  hostDisconnected(): void {
    window.removeEventListener(
      "sound-update",
      this._changeSound as EventListener
    );
  }
}
