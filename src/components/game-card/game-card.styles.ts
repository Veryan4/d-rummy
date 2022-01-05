import { css } from "lit";

export const cardStyles = css`
  :host {
    display: inline-block;
    font-size: 3em;
    height: 264px; /* 88 * 3 */
    width: 186px; /* 62 * 3 */
    min-width: 186px; /* 62 * 3 */

    -webkit-touch-callout: none; /* iOS Safari */
    -webkit-user-select: none; /* Chrome/Safari/Opera */
    -khtml-user-select: none; /* Konqueror */
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* Internet Explorer/Edge */
    user-select: none; /* Non-prefixed version, currently not supported by any browser */
  }
  :host(.small) {
    font-size: 1em;
    height: 88px;
    width: 62px;
    min-width: 62px;
  }

  :host * {
    box-sizing: border-box;
  }

  #container {
    position: relative;
    height: 100%;
    width: 100%;

    /* entire container, keeps perspective */
    perspective: 1000px;
  }

  #front.selected,
  #back.selected {
    border: 1px solid blue;
  }

  #front,
  #back {
    /* flip speed goes here */
    transition: transform 0.6s;
  }

  #back {
    /* back, initially hidden pane */
    transform: rotateY(-180deg);
  }

  /* flip the pane when hovered */
  :host([unrevealed]) #back {
    transform: rotateY(0deg);
  }
  :host([unrevealed]) #front {
    transform: rotateY(180deg);
  }

  #front,
  #back {
    width: 100%;
    height: 100%;
  }

  #front,
  #back {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    position: absolute;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12),
      0 3px 1px -2px rgba(0, 0, 0, 0.2);
    top: 0;
    left: 0;
  }
  #back {
    padding: 10px;
  }

  #back-draw {
    height: 100%;
    width: 100%;
    border-radius: 10px;
    background-color: #8fa0b5;
    background-image: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYxIiBoZWlnaHQ9IjEzMiIgdmlld0JveD0iMCAwIDE2MSAxMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IHgxPSIwJSIgeTE9IjUwJSIgeTI9IjUwJSIgaWQ9ImEiPjxzdG9wIHN0b3AtY29sb3I9IiMyQTNCOEYiIG9mZnNldD0iMCUiLz48c3RvcCBzdG9wLWNvbG9yPSIjMjlBQkUyIiBvZmZzZXQ9IjEwMCUiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCB4MT0iMCUiIHkxPSI1MCUiIHkyPSI1MCUiIGlkPSJiIj48c3RvcCBzdG9wLWNvbG9yPSIjMkEzQjhGIiBvZmZzZXQ9IjAlIi8+PHN0b3Agc3RvcC1jb2xvcj0iIzI5QUJFMiIgb2Zmc2V0PSIxMDAlIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgeDE9IjEwMCUiIHkxPSI1MCUiIHgyPSIwJSIgeTI9IjUwJSIgaWQ9ImMiPjxzdG9wIHN0b3AtY29sb3I9IiNCNEQ0NEUiIG9mZnNldD0iMCUiLz48c3RvcCBzdG9wLWNvbG9yPSIjRTdGNzE2IiBvZmZzZXQ9IjEwMCUiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCB4MT0iMTAwJSIgeTE9IjUwJSIgeDI9IjAlIiB5Mj0iNTAlIiBpZD0iZCI+PHN0b3Agc3RvcC1jb2xvcj0iI0I0RDQ0RSIgb2Zmc2V0PSIwJSIvPjxzdG9wIHN0b3AtY29sb3I9IiNFN0Y3MTYiIG9mZnNldD0iMTAwJSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggZmlsbD0iIzE2NkRBNSIgZD0iTTE2MC42IDY1LjlsLTE3LjQgMjkuMy0yNC40LTI5LjcgMjQuNC0yOC45eiIvPjxwYXRoIGZpbGw9IiM4RkRCNjkiIGQ9Ik0xNDEuMyAxMDAuMmwtMjYuNS0zMS43LTE1LjkgMjYuNiAyNC43IDM2LjF6Ii8+PHBhdGggZmlsbD0iIzE2NkRBNSIgZD0iTTE0MSAzMS40bC0yNi4yIDMxLjgtMTUuOS0yNi42TDEyMy42Ljl6Ii8+PHBhdGggZmlsbD0idXJsKCNhKSIgb3BhY2l0eT0iLjk1IiBkPSJNNjEuMSAzMS40SDE0MUwxMjMuNC45SDc4Ljd6Ii8+PHBhdGggZmlsbD0idXJsKCNiKSIgb3BhY2l0eT0iLjk1IiBkPSJNMTE0LjggNjMuM0gxNTlsLTE1LjktMjYuOEg5OC44Ii8+PHBhdGggZmlsbD0idXJsKCNjKSIgb3BhY2l0eT0iLjk1IiBkPSJNMTQxLjMgMTAwLjNINjFsMTcuNiAzMC41aDQ1eiIvPjxwYXRoIGZpbGw9IiMwMTAxMDEiIGQ9Ik03OC42IDEzMC44TDQxIDY1LjggNzkuMS44SDM3LjlMLjQgNjUuOGwzNy41IDY1eiIvPjxwYXRoIGZpbGw9InVybCgjZCkiIG9wYWNpdHk9Ii45NSIgZD0iTTExNC44IDY4LjRIMTU5bC0xNS45IDI2LjhIOTguOCIvPjwvZz48L3N2Zz4=");
    background-repeat: no-repeat;
    background-position: 50% 50%;
    background-size: 50%;
  }

  /* front pane, placed above back */
  #front {
    z-index: 2;
    /* for firefox 31 */
    transform: rotateY(0deg);
  }

  .rank,
  .symbol {
    display: inline-block;
    position: absolute;
  }

  .rank {
    top: 12px;
    left: 12px;
    text-align: center;
    font-size: 0.8em;
    line-height: 0.8em;
  }

  .rank.reversed {
    top: auto;
    left: auto;
    right: 12px;
    bottom: 12px;
  }

  :host(.small) .rank {
    top: 6px;
    left: 6px;
  }

  :host(.small) .rank.reversed {
    right: 6px;
    bottom: 6px;
    top: unset;
    left: unset;
  }

  .rank-symbol {
    font-size: 0.7em;
  }

  .reversed {
    transform: rotateZ(180deg);
  }

  .h-centered {
    left: 50%;
    transform: translateX(-50%);
  }

  .v-centered {
    top: 50%;
    transform: translateY(-50%);
  }

  .h-centered.v-centered {
    transform: translateX(-50%) translateY(-50%);
  }

  .h-centered.reversed {
    transform: translateX(-50%) rotateZ(180deg);
  }

  .v-centered.reversed {
    transform: translateY(-50%) rotateZ(180deg);
  }

  .h-centered.v-centered.reversed {
    transform: translateX(-50%) translateY(-50%) rotateZ(180deg);
  }

  .top {
    top: 10%;
  }

  .bottom {
    bottom: 10%;
  }

  .left {
    left: 20%;
  }

  .right {
    right: 20%;
  }

  .near-top {
    top: 20%;
  }

  .near-bottom {
    bottom: 20%;
  }

  .far-top {
    top: 30%;
  }

  .far-bottom {
    bottom: 30%;
  }

  .hidden {
    display: none;
  }

  .red {
    color: red;
  }

  .black {
    color: black;
  }

  .figure {
    width: 100%;
    max-height: 100%;
  }
`;
