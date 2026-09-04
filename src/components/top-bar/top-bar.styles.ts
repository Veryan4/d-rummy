import { css } from "lit";

export const styles = css`
  .icon {
    width: 2rem;
    height: 2rem;
    display: inline-block;
    color: var(--primary-color);
    cursor: pointer;
    vertical-align: middle;
    padding-right: 1rem;
  }

  .mdc-top-app-bar {
    background-color: var(--secondary-background-color);
    color: var(--primary-color);
  }

  .menu-item {
    display: flex;
    width: max-content;
    align-items: center;
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 50px;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.03em;
    color: var(--primary-color);
    cursor: pointer;
  }
  .logo svg {
    height: 2rem;
    width: auto;
    color: var(--primary-color);
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
  .icon.hamburger {
    color: var(--primary-color);
    padding-left: 1rem;
  }

  .help-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1100;
  }
  .help-panel {
    position: fixed;
    z-index: 1101;
    display: flex;
    flex-direction: column;
    background: var(--secondary-background-color);
    color: var(--primary-color);
    font-family: var(--font-family);
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.2);
  }
  .help-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--outline-color);
    font-size: 1.125rem;
    font-weight: 600;
    text-transform: capitalize;
  }
  .help-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: none;
    background: none;
    color: var(--primary-color);
    cursor: pointer;
  }
  .help-close svg {
    width: 1.5rem;
    height: 1.5rem;
    fill: currentColor;
  }
  .help-panel-body {
    overflow-y: auto;
    flex: 1;
  }
  @media only screen and (min-width: 752px) {
    .help-panel {
      top: 0;
      right: 0;
      width: min(42vw, 36rem);
      height: 100dvh;
    }
  }
  @media only screen and (max-width: 751px) {
    .help-panel {
      top: 3dvh;
      right: 3vw;
      width: 94vw;
      height: 94dvh;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28);
    }
  }
`;
