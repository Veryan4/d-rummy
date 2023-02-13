import { css } from "lit";

export const styles = css`
  .table-wrapper,
  h1 {
    display: flex;
    font-family: var(--font-family);
  }
  .winner-overlay {
    font-family: var(--font-family);
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
  .deck game-card, .pile game-card{
    height: 8dvw;
  }
  .table.draw {
    border: 2px solid var(--theme-color);
  }
  .table {
    border-radius: 1rem;
    padding: 0 1rem 1rem;
  }
  .pile.discard {
    border: 2px solid var(--theme-color);
  }
  .pile {
    border-radius: 1rem;
    padding-left: 1rem;
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
  game-card,
  .set,
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
    padding-right: 2rem;
    margin: 0.5rem;
  }
  .set.five {
    padding-right: 3rem;
  }
  .set.six {
    padding-right: 3rem;
  }
  .set.seven {
    padding-right: 4rem;
  }
  .set.eight {
    padding-right: 4rem;
  }
  .set.nine {
    padding-right: 4rem;
  }
  .set.ten {
    padding-right: 5rem;
  }
  .set.eleven {
    padding-right: 5rem;
  }
  .set.twelve {
    padding-right: 5rem;
  }
  .set.empty {
    padding-right: unset;
    border: none;
    display: unset;
  }
  .other {
    display: flex;
    flex-direction: column;
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
  .winner-overlay {
    position: fixed;
    z-index: 1;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0, 0, 0, 0.4);
  }

  .winner-modal {
    background-color: var(--primary-background-color);
    margin: 15% auto;
    padding: 20px;
    border: 2px solid var(--outline-color);
    width: fit-content;
  }

  .winner-text {
    margin-bottom: 1rem;
  }

  .winner-buttons {
    display: flex;
  }

  @media only screen and (max-width: 752px) {
    .table-wrapper {
      flex-direction: column;
    }
    .first-half {
      display: flex;
      flex-direction: column-reverse;
    }
    .deck game-card, .pile game-card{
      height: 26dvw;
    }
    .empty-card {
      height: calc(26dvw - 6px);
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
