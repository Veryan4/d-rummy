import { css } from "lit";

export const styles = css`
  :host {
    display: block;
    width: 100%;
  }
  .about-container {
    display: flex;
    justify-content: center;
    width: 100%;
    line-height: 1.8;
    font-family: var(--font-family);
  }
  .about-wrap {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    max-width: 935px;
    padding: 15px 20px 60px 20px;
    margin: 0 auto 30px;
  }
  .about-title {
    color: var(--primary-color);
    padding-top: 25px;
    font-size: 28px;
    font-weight: 600;
    font-family: "Source Sans Pro", sans-serif;
  }
  .about-sub-title {
    font-size: 21px;
    font-weight: 600;
    padding-top: 25px;
  }
  .about-item {
  }
  strong {
    display: inline;
  }
  :host([compact]) .about-wrap {
    padding: 0 1rem 2rem;
    margin: 0;
  }
  :host([compact]) .about-title {
    font-size: 1.25rem;
    padding-top: 1.25rem;
  }
  :host([compact]) .about-sub-title {
    font-size: 1.1rem;
    padding-top: 1.25rem;
  }
`;
