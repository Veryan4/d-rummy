import { css } from "lit";

export const scrollBarStyles = css`
  /* Desktop */
  @media screen and (min-width: 780px) {
    ::-webkit-scrollbar {
      background-color: var(--secondary-background-color);
      width: 16px;
    }

    ::-webkit-scrollbar-track {
      background-color: var(--secondary-background-color);
    }

    ::-webkit-scrollbar-thumb {
      background-color: #babac0;
      border-radius: 16px;
      border: 4px solid var(--secondary-background-color);
    }

    ::-webkit-scrollbar-button {
      display: none;
    }
  }
`;
