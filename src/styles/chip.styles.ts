import { css } from "lit";

export const chipStyles = css`
  .chip-set {
    display: flex;
    flex-wrap: wrap;
  }
  .md-chip {
    display: inline-block;
    background: #e0e0e0;
    padding: 0 12px;
    border-radius: 32px;
    font-size: 13px;
    font-family: var(--font-family);
    color: #333;
    cursor: pointer;
    display: flex;
    width: fit-content;
  }

  .md-chip:hover,
  .md-chip.selected:hover,
  .md-chip.selected:hover .material-icons {
    background: #ccc;
  }

  .md-chip.selected {
    background-color: #153333;
    color: #fff;
  }

  .md-chip.selected .material-icons {
    background-color: #153333;
    color: #fff;
  }

  .md-chip .material-icons {
    border-radius: 32px;
    align-items: center;
    display: flex;
    margin-left: 0.5rem;
  }

  .md-chip {
    height: 32px;
    line-height: 32px;
  }

  .md-chip-btn {
    display: inline-block;
    background: #aaa;
    border: 0;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    padding: 0;
    margin: 0 -4px 0 4px;
    cursor: pointer;
    font: inherit;
    line-height: 20px;
  }
  .md-chip-btn.removable:after {
    color: #e0e0e0;
    content: "x";
  }
  .md-chip-btn:hover {
    background: #999;
  }
  .md-chip-btn.selected {
    background: #777;
  }

  .md-chip {
    margin: 0 5px 3px 0;
  }

  *,
  *:before,
  *:after {
    box-sizing: border-box;
  }
`;
