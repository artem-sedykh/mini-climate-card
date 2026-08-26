import define from '../utils/define';
import { LitElement, html, css, type PropertyValues, type TemplateResult } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import sharedStyle from '../sharedStyle';
import type ButtonObject from '../models/button';

export default class ClimateButton extends LitElement {
  button!: ButtonObject;

  /** The state the button is showing, which a press flips before the device
   * confirms it. `actionTimeout` puts it back if nothing comes. */
  private _isOn: boolean;

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    super();
    this._isOn = false;
    this.timer = undefined;
  }

  static override get properties() {
    return {
      button: { type: Object },
    };
  }

  handleToggle(e: Event): void {
    e.stopPropagation();
    const { entity } = this.button;

    this._isOn = !this._isOn;
    this.button.handleToggle();

    if (this.timer) clearTimeout(this.timer);

    this.timer = setTimeout(async () => {
      if (this.button.entity === entity) {
        this._isOn = this.button.isOn;
        this.requestUpdate('_isOn');
      }
    }, this.button.actionTimeout);
    this.requestUpdate('_isOn');
  }

  override render(): TemplateResult {
    return html`
       <ha-icon-button
         style=${styleMap(this.button.style)}
         .icon=${this.button.icon}
         @click=${(e: Event) => this.handleToggle(e)}
         ?disabled="${this.button.disabled || this.button.isUnavailable}"
         ?color=${this._isOn}>
           <ha-icon .icon=${this.button.icon}></ha-icon>
        </ha-icon-button>
    `;
  }

  // Before the render, not after it. `_isOn` is derived from the model the
  // card just handed down, so it is already knowable when the update starts;
  // assigning it in `updated()` asked for a second pass over a value nothing
  // had learned in between.
  override willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has('button')) {
      this._isOn = this.button.isOn;

      if (this.timer) clearTimeout(this.timer);
    }
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
    `,
    ];
  }
}

define('mc-button', ClimateButton);
