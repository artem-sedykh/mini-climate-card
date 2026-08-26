import define from '../utils/define';
import { LitElement, html, css, type PropertyDeclarations, type TemplateResult } from 'lit';
import sharedStyle from '../sharedStyle';
import type ButtonObject from '../models/button';
import './button';
import './dropdown';

export default class ClimateButtons extends LitElement {
  buttons!: Record<string, ButtonObject>;

  // `{ type: Object }` rather than the bare `{}` this used to name - see #230.
  static override get properties(): PropertyDeclarations {
    return {
      buttons: { type: Object },
    };
  }

  renderButton(button: ButtonObject): TemplateResult | string {
    if (button.isUnavailable) return '';

    return html`
       <mc-button
         class="custom-button"
         .button=${button}>
        </mc-button>
    `;
  }

  renderDropdown(dropdown: ButtonObject): TemplateResult | string {
    return html`
      <mc-dropdown
        .dropdown=${dropdown}>
      </mc-dropdown>
    `;
  }

  renderInternal(button: ButtonObject): TemplateResult | string {
    if (button.type === 'dropdown') return this.renderDropdown(button);

    return this.renderButton(button);
  }

  override render(): TemplateResult {
    return html`${Object.entries(this.buttons)
      .map(b => b[1])
      .filter(b => b.location !== 'main' && !b.hide)
      .sort((a, b) =>
        (a.order as number) > (b.order as number)
          ? 1
          : (b.order as number) > (a.order as number)
            ? -1
            : 0,
      )
      .map(button => this.renderInternal(button))}`;
  }

  static override get styles() {
    return [
      sharedStyle,
      css`
      :host {
        position: relative;
        box-sizing: border-box;
        margin: 0;
        overflow: hidden;
        transition: background .5s;
        --paper-item-min-height: var(--mc-unit);
        --mc-dropdown-unit: var(--mc-unit);
        --mdc-icon-button-size: calc(var(--mc-unit));
        --ha-icon-button-size: calc(var(--mc-unit));
      }
      :host([color]) {
        background: var(--mc-active-color);
        transition: background .25s;
        opacity: 1;
      }
      :host([disabled]) {
        opacity: .25;
        pointer-events: none;
      }
      mc-button {
        width: calc(var(--mc-unit));
        height: calc(var(--mc-unit));
      }
    `,
    ];
  }
}

define('mc-buttons', ClimateButtons);
