import { css } from "lit";

export const styles = css`

    .hand {
        display: grid;
        grid-gap: 0.5rem;
        grid-template-columns: repeat(7, 3rem);
        transition: grid-template-columns 0.5s;
    }

    .card-wrapper.dragging game-card {
        cursor: grabbing;
    }

    @media only screen and (max-width: 752px) {
        .hand {
        grid-template-columns: repeat(5, 2rem);
        position: absolute;
        left: 0.5rem;
        }
    }
    @media only screen and (min-width: 752px) {
        .hand .card-wrapper::before {
            position: absolute;
        }
        .hand .card-wrapper game-card[draggable=true] {
            transform: translate(0, -1rem);
        }
    }
`;
