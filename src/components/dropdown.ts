import define from '../utils/define';
import { LitElement, html, css, type PropertyValues, type TemplateResult } from 'lit';
import sharedStyle from '../sharedStyle';
import type ButtonObject from '../models/button';
import './dropdown-base';

export default class ClimateDropDown extends LitElement {
  dropdown!: ButtonObject;

  private timer: ReturnType<typeof setTimeout> | undefined;

  /** What the dropdown is showing, which a pick changes before the device
   * confirms it. `actionTimeout` puts it back if nothing comes. */
  private _state: string | undefined;

  constructor() {
    super();
    this.dropdown = {} as ButtonObject;
    this.timer = undefined;
    this._state = undefined;
  }

  static override get properties() {
    return {
      dropdown: { type: Object },
    };
  }

  handleChange(e: CustomEvent): void {
    e.stopPropagation();

    const selected = e.detail.id;
    const { entity } = this.dropdown;
    this._state = selected;

    this.dropdown.handleChange(selected);

    if (this.timer) clearTimeout(this.timer);

    this.timer = setTimeout(async () => {
      if (this.dropdown.entity === entity) {
        this._state =
          this.dropdown.state !== undefined && this.dropdown.state !== null
            ? this.dropdown.state.toString()
            : '';

        this.requestUpdate('_state');
      }
    }, this.dropdown.actionTimeout);

    this.requestUpdate('_state');
  }

  override render(): TemplateResult {
    return html`
      <mc-dropdown-base
        .iconStyle=${this.dropdown.style}
        @change=${(e: CustomEvent) => this.handleChange(e)}
        .items=${this.dropdown.source}
        .icon=${this.dropdown.icon}
        .disabled="${this.dropdown.disabled}"
        .active=${this.dropdown.isActive(this._state)}
        .selected=${this._state}>
      </mc-dropdown-base>
    `;
  }

  // See the note in button.js: derived before the render rather than after
  // it, so one state change costs one pass.
  override willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has('dropdown')) {
      this._state =
        this.dropdown.state !== undefined && this.dropdown.state !== null
          ? this.dropdown.state.toString()
          : '';

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

define('mc-dropdown', ClimateDropDown);
