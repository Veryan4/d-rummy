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
    border: 0.5rem solid var(--theme-color);
    top: -1rem;
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
    border: 1px solid;
    background: var(--secondary-background-color);
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
    background-image: url("/d-rummy-text.png");
    background-repeat: no-repeat;
    background-position: 50% 50%;
    background-size: 85%;
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
    color: var(--primary-color);
  }

  .figure {
    width: 100%;
    max-height: 100%;
    filter: var(--image-color);
  }
`;
