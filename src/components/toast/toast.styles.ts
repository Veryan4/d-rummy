import { css } from "lit";

export const styles = css`
  .toast-container {
    position: fixed;
    bottom: 10rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    z-index: 10000;
    font-family: var(--font-family);
  }

  .toast {
    position: relative;
    margin-bottom: 0.5rem;
    transition: all 1s ease-out;
    transform: translateY(var(--toast-offset));
  }

  .toast-wrap {
    padding: 1rem;
    background: var(--toast-background);
    color: var(--toast-color);
    border-radius: var(--toast-border-radius);
  }

  .toast.error .toast-wrap {
    background: crimson;
    color: #fff;
  }
`;
