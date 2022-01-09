import { css } from "lit";

export const checkBoxStyles = css`
  mwc-checkbox {
    --mdc-theme-secondary: #296954;
    --mdc-checkbox-ink-color: var(--primary-color);
    --mdc-theme-text-primary-on-background: var(--primary-color);
    --mdc-checkbox-unchecked-color: var(--input-fill);
    --mdc-checkbox-disabled-color: var(--input-fill);
  }
  mwc-formfield {
    --mdc-theme-text-primary-on-background: var(--primary-color);
  }
`;
