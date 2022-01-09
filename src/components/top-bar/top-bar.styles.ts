import { css } from "lit";

export const styles = css`
  .material-icons {
    font-family: "Material Icons";
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: "liga";
    -webkit-font-smoothing: antialiased;

    vertical-align: middle;
    padding-right: 1rem;
  }

  .mdc-top-app-bar {
    background-color: var(--secondary-background-color);
    color: var(--primary-color);
  }

  @media screen and (min-width: 780px) {
    .mdc-top-app-bar__section--align-end,
    .mdc-top-app-bar__section--align-start {
      justify-content: center;
      justify-content: center;
    }
  }

  header {
    width: 100%;
    border-bottom: 1px solid var(--outline-color);
    display: flex;
    justify-content: center;
    position: fixed;
    z-index: 999;
    font-family: var(--font-family);
  }

  .logo {
    background-image: url("./d-rummy-logo.png");
    width: 170px;
    height: 50px;
    background-size: contain;
    background-repeat: no-repeat;
    cursor: pointer;
    filter: var(--image-color);
  }
  .flag {
    background-size: contain;
    background-repeat: no-repeat;
    cursor: pointer;
    height: 1rem;
    width: 1rem;
  }
  .uk-flag {
    background-image: url("/uk-flag.svg");
  }
  .fr-flag {
    background-image: url("/fr-flag.svg");
  }
  .links {
    color: var(--primary-color);
    font-family: var(--font-family);
    font-size: 15px;
    font-weight: initial;
    letter-spacing: -1px;
    line-height: 1;
    text-align: center;
    padding: 15px;
  }
  a {
    cursor: pointer;
    text-decoration: unset;
    color: unset;
  }
  .material-icons.mdc-top-app-bar__action-item.mdc-icon-button.hamburger {
    color: var(--primary-color);
  }
`;
