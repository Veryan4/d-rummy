import { css } from "lit";

export const styles = css`
    .tooltip {
        position: relative;
        display: inline-block;
    }

    /* Tooltip text */
    .tooltip .tooltiptext {
        visibility: hidden;
        background: var(--toast-background);
        color: var(--toast-color);
        text-align: center;
        width: fit-content;
        height: fit-content;
        border-radius: 6px;
        padding: 0 1rem;
        
        /* Position the tooltip text - see examples below! */
        position: absolute;
        z-index: 1;

        /* fade-in */
        opacity: 0;
        transition: opacity 1s;
    }

    .tooltip:hover .tooltiptext {
        opacity: 1;
        visibility: visible;
        font-size: var(--font-size)
    }

    .tooltip .tooltiptext.right {
        left: 105%;
        top: 0;
        bottom: 0;
        margin-top: auto;
        margin-bottom: auto;
    }

    .tooltip .tooltiptext.right::after {
        content: " ";
        position: absolute;
        top: 50%;
        right: 100%;
        margin-top: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: transparent var(--toast-background) transparent transparent;
    }

    .tooltip .tooltiptext.left {
        right: 105%;
        top: 0;
        bottom: 0;
        margin-top: auto;
        margin-bottom: auto;
    }

    .tooltip .tooltiptext.left::after {
        content: " ";
        position: absolute;
        top: 50%;
        left: 100%;
        margin-top: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: transparent transparent transparent var(--toast-background);
    }

    .tooltip .tooltiptext.top {
        bottom: 100%;
        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;
    }

    .tooltip .tooltiptext.top::after {
        content: " ";
        position: absolute;
        top: 100%; /* At the bottom of the tooltip */
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: var(--toast-background) transparent transparent transparent;
    }

    .tooltip .tooltiptext.bottom {
        top: 100%;
        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;
    }
    
    .tooltip .tooltiptext.bottom::after {
        content: " ";
        position: absolute;
        bottom: 100%;  /* At the top of the tooltip */
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: transparent transparent var(--toast-background) transparent;
    }
`;
