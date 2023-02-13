import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("not-found")
class NotFound extends LitElement {
  static styles = [
    css`
      html,
      body {
        background-color: var(--primary-background-color);
        color: var(--primary-color);
        font-family: var(--font-family);
        font-weight: 100;
        height: 100dvh;
        margin: 0;
      }
      .wrap {
        background-color: var(--primary-background-color);
        height: 100dvh;
        align-items: center;
        display: flex;
        justify-content: center;
        position: relative;
      }
      .code {
        border-right: 2px solid;
        font-size: 26px;
        padding: 0 10px 0 15px;
        text-align: center;
        color: var(--primary-color);
        border-color: var(--primary-color)
      }
      .message {
        font-size: 18px;
        text-align: center;
        padding: 10px;
        color: var(--primary-color);
      }
    `,
  ];

  render() {
    return html`
      <div class="wrap">
        <div class="code">404</div>
        <div class="message">Not Found</div>
      </div>
    `;
  }
}
