import { css } from "lit";

export const styles = css`
  .table-wrapper {
    display: flex;
  }
  .first-half {
    margin-right: 5rem;
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
  .table.draw {
    border: 2px solid var(--theme-color);
    border-radius: 1rem;
    padding: 1rem;
  }
  .count {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 1rem;
    font-weight: 700;
  }
  .row{
    display: flex;
  }
  .empty-card {
    height: 86px;
    width: 60px;
    border-radius: 10px;
    border: 3px dotted var(--primary-color);
  }
  game-card,
  .set, .pile {
    cursor: pointer;
  }
  .sets {
    display: flex;
  }
  .set {
    display: grid;
    grid-gap: 0.5rem;
    grid-template-columns: repeat(auto-fill, minmax(0, max-content));
    transition: grid-template-columns 0.5s;
    border: 1px dotted var(--primary-color);
    width: fit-content;
    padding: 0.5rem;
    border-radius: 0.5rem;
    margin-right: 0.5rem;
  }
  .set:not(.empty) {
    padding-right: 2rem;
  }
  .set.empty {
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
  .other-info {
    display: flex;
    padding: 1rem;
  }
  .other-sets {
    display: flex;
    padding: 0 1rem 1rem 1rem;
  }
  .other-name {
    display: flex;
    align-items: center;
    padding: 0 1rem;
  }
  .player-image {
    width: 2rem;
    height: 2rem;
    border-radius: 2rem;
  }
  .hand {
    display: grid;
    grid-gap: 0.5rem;
    grid-template-columns: repeat(7, 3rem);
    transition: grid-template-columns 0.5s;
  }

  .hand .card-wrapper:hover {
    z-index: 9;
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
      margin-right: unset;
    }

    .hand {
      grid-template-columns: repeat(5, 2rem);
      position: absolute;
      left: 0.5rem;
    }

    .hand .card-wrapper:hover {
      z-index: unset;
    }
  }
`;
