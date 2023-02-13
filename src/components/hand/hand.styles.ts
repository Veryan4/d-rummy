import { css } from "lit";

export const styles = css`
  .hand {
    display: grid;
    width: 10%;
    grid-gap: 5%;
    grid-template-columns: repeat(7, 100%);
    transition: grid-template-columns 0.5s;
  }

  game-card {
    width: 14dvw;
  }

  .card-wrapper {
    width: fit-content;
  }

  .card-wrapper.dragging game-card {
    cursor: grabbing;
  }

  @media only screen and (max-width: 752px) {
    .hand {
      grid-template-columns: repeat(5, 100%);
      position: absolute;
      left: 2rem;
    }
    game-card {
      width: 40dvw;
    }
  }
  @media only screen and (min-width: 752px) {
    .hand .card-wrapper::before {
      position: absolute;
    }
    .hand .card-wrapper game-card[draggable="true"] {
      transform: translate(0, -5%);
    }
  }
`;
