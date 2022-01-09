import { css } from "lit";

export const switchStyles = css`
  mwc-switch {
    --mdc-theme-primary: var(--theme-color);
    --mdc-switch-selected-track-color: var(--input-fill);
    --mdc-switch-selected-handle-color: var(--theme-color);
    --mdc-switch-handle-surface-color: var(--theme-color);
    --mdc-switch-selected-hover-handle-color: var(--theme-color);
    --mdc-switch-selected-focus-handle-color: var(--theme-color);
    --mdc-switch-selected-pressed-handle-color: var(--theme-color);
    --mdc-switch-selected-hover-track-color: var(--input-fill);
    --mdc-switch-selected-focus-track-color: var(--input-fill);
    --mdc-switch-selected-pressed-track-color: var(--input-fill);
  }
`;
