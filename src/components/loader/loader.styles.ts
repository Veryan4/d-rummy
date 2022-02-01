import { css } from "lit";

export const styles = css`

    :host(.small) .loader {
        height: unset
    }
    
    .loader {
        height: 88vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
`;
