import { css } from "lit";

export const styles = css`
  mwc-button {
    --mdc-theme-primary: #296954;
    --mdc-theme-on-primary: white;
  }

  mwc-textfield {
    --mdc-theme-primary: #296954;
  }

  .lobby {
    font-family: "Roboto", sans-serif;
  }

  .players-waiting {
    border: 1px solid blue;
    border-radius: 1rem;
    padding: 0 1rem 1rem 1rem;
    min-width: 20rem;
    margin: 1rem 0;
  }
  .players-waiting p {
    font-size: 1.5rem;
  }
  .player {
    display: flex;
    padding: 1rem 0;
  }
  .player-image {
    width: 2rem;
    height: 2rem;
    border-radius: 2rem;
  }
  .player-name {
    padding: 0 1rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .host {
    padding: 1rem 0;
  }
  mwc-button {
    --mdc-theme-primary: #296954;
    --mdc-theme-on-primary: white;
  }

  .card {
    font-family: "Roboto", sans-serif;
    width: 275px;
    margin: 110px auto;
    background-color: white;
    border: 1px solid #b0bec5;
    border-radius: 1px;
    padding: 30px;
    box-shadow: 0 2px 1px -1px rgba(0, 0, 0, 0.2),
      0 1px 1px 0 rgba(0, 0, 0, 0.14), 0 1px 3px 0 rgba(0, 0, 0, 0.12);
  }
  .form-field {
    line-height: 1.5;
    border-top: unset;
    padding: 0.4375em 0;
    display: block;
    position: relative;
    flex: auto;
    min-width: 0;
    width: 180px;
    margin-right: 20px;
  }
  .card-title {
    font-size: 24px;
    font-weight: 500;
    margin-bottom: 20px;
  }
  .form-buttons {
    padding: 8px 0;
  }

  @media only screen and (max-width: 752px) {
    .card {
      margin: 60px auto;
    }
  }
`;
