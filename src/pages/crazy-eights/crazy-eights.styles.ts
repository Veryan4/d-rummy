import { css } from "lit";
import { styles as rummyStyles } from "../rummy/rummy.styles";

export const extraStyles = css`
  .status-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  .suit-picker {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin-bottom: 1rem;
  }
  .suit-btn {
    font-size: 1rem;
    min-width: 3.5rem;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }
  .current-suit {
    font-size: 1.5rem;
  }
  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .table.draw,
  .pile.discard {
    border: none;
  }
  @media only screen and (min-width: 752px) {
    :host {
      display: flex;
      flex-direction: column;
      min-height: calc(100dvh - 7rem);
    }
    .others {
      max-height: 10rem;
      overflow-y: scroll;
    }
    .table-wrapper {
      min-height: 0;
    }
    .first-half,
    .second-half {
      width: auto;
      flex: 1;
    }
    .hand-section {
      flex: 1 1 50%;
      min-height: 50vh;
      display: flex;
      flex-direction: column;
    }
    card-hand {
      flex: 1;
      --hand-card-width: min(14dvw, 22dvh);
    }
  }
`;

export const styles = [rummyStyles, extraStyles];
