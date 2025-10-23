import { css } from "lit";

export const styles = css`
  .infraction-btn {
    --md-filled-button-container-color: crimson;
  }
  .audit-wrapper {
    width: 70dvw;
  }
  .audit-wrapper,
  h1 {
    display: flex;
    font-family: var(--font-family);
  }
  .hidden {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 100;
    width: 100dvw;
    height: 100dvh;
    padding: 4rem;
    background-color: grey;
    opacity: 0.95;
  }
  .hidden-cards {
    display: grid;
    grid-gap: 1.6rem;
    grid-template-columns: repeat(auto-fill, minmax(0, max-content));
    transition: grid-template-columns 0.5s;
    width: 100%;
    margin-right: 1rem;
    opacity: 1;
  }
  .hidden-cards game-card {
    width: 12dvw;
    opacity: 1;
  }
  .table,
  .deck,
  .pile {
    display: flex;
  }
  .deck,
  .pile {
    flex-direction: column;
  }
  .deck game-card,
  .pile game-card,
  .hand game-card,
  .set game-card {
    width: 6dvw;
  }
  .table.draw {
    border: 2px solid var(--theme-color);
  }
  .table {
    border-radius: 1rem;
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  .audit-header {
    display: flex;
    flex-direction: row;
    justify-content: center;
  }
  .turns {
    display: flex;
    justify-content: space-between;
    margin-top: 2rem;
  }
  .pile.discard {
    border: 2px solid var(--theme-color);
  }
  .pile {
    border-radius: 1rem;
    padding-left: 1rem;
    padding-bottom: 1rem;
  }
  .count {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 1rem;
    font-weight: 700;
  }
  .row {
    display: flex;
  }
  .empty-card {
    height: calc(8dvw - 6px);
    aspect-ratio: 2.5/3.5;
    border-radius: 10px;
    border: 3px dotted var(--primary-color);
    font-size: 0.8rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .hand {
    display: grid;
    grid-gap: 0.8rem;
    grid-template-columns: repeat(auto-fill, minmax(0, max-content));
    transition: grid-template-columns 0.5s;
    width: fit-content;
    margin-right: 0.5rem;
  }
  .hand {
    padding-right: 2.5rem;
    margin: 0.5rem;
  }
  game-card,
  .pile {
    cursor: pointer;
  }
  .sets,
  .other-sets {
    display: flex;
    flex-wrap: wrap;
  }
  .set {
    display: grid;
    grid-gap: 0.8rem;
    grid-template-columns: repeat(auto-fill, minmax(0, max-content));
    transition: grid-template-columns 0.5s;
    border: 1px dotted var(--primary-color);
    width: fit-content;
    padding: 0.5rem;
    border-radius: 0.5rem;
    margin-right: 0.5rem;
  }
  .set {
    padding-right: 2.5rem;
    margin: 0.5rem;
  }
  .set-4 {
    padding-right: 3.5rem;
  }
  .set-5,
  .set-6,
  .set-7,
  .set-8,
  .set-9,
  .set-10,
  .set-11,
  .set-12 {
    padding-right: 4.5rem;
  }
  .set.empty {
    padding-right: unset;
    border: none;
    display: unset;
  }
  .other {
    display: flex;
    flex-direction: column;
    padding: 0 1rem;
  }
  .other.active {
    border: 2px solid var(--theme-color);
    border-radius: 1rem;
  }
  .other.active.error {
    border: 2px solid var(--error-color);
  }
  .other-info {
    display: flex;
    padding: 1rem;
  }
  .other-sets {
    padding: 0 1rem 1rem 1rem;
  }
  .other-name {
    display: flex;
    align-items: center;
    padding: 0 1rem;
  }
  .other-name.error {
    color: var(--error-color);
  }
  .player-image {
    width: 2rem;
    height: 2rem;
    border-radius: 2rem;
  }

  .infractions {
    color: red;
  }

  @media only screen and (max-width: 752px) {
    .audit-wrapper {
      flex-direction: column;
      width: 90dvw;
    }
    .first-half {
      display: flex;
      flex-direction: column-reverse;
    }
    .deck game-card,
    .pile game-card,
    .hand game-card,
    .set game-card {
      width: 19dvw;
    }
    .empty-card {
      height: calc(26dvw - 6px);
    }
    .hidden {
      padding: 1rem;
    }
    .hidden-cards {
      width: 67%;
    }
    .hidden-cards game-card {
      width: 24dvw;
    }
  }
  @media only screen and (min-width: 752px) {
    .first-half {
      padding-right: 2rem;
    }
    .second-half {
      padding-left: 2rem;
    }
    .first-half,
    .second-half {
      width: 30dvw;
    }
  }
`;
