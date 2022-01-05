import { css } from "lit";

export const styles = css`
  .about-container {
    display: flex;
    justify-content: center;
    width: 100vw;
    line-height: 1.8;
    font-family: "Roboto", sans-serif;
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
    color: black;
    padding-top: 25px;
    font-size: 28px;
    font-weight: 600;
    font-family: "Source Sans Pro", sans-serif;
  }
  .about-sub-title {
    font-size: 21px;
    font-weight: 600;
  }
  .about-item {
  }
  strong {
    display: inline;
  }
`;
