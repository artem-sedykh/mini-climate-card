import { LitElement, html, css } from 'lit';
import { styleMap } from 'lit/directives/style-map';
import sharedStyle from '../sharedStyle';

export default class ClimateDropDown extends LitElement {
  constructor() {
    super();
    this.dropdown = {};
    this.timer = undefined;
    this._state = undefined;
  }

  static get properties() {
    return {
      dropdown: { type: Object },
    };
  }

  handleChange(e) {
    e.stopPropagation();

    const selected = e.detail.id;
    const { entity } = this.dropdown;
    this._state = selected;

    this.dropdown.handleChange(selected);

    if (this.timer)
      clearTimeout(this.timer);

    this.timer = setTimeout(async () => {
      if (this.dropdown.entity === entity) {
        this._state = (this.dropdown.state !== undefined && this.dropdown.state !== null)
          ? this.dropdown.state.toString() : '';

        this.requestUpdate('_state');
      }
    }, this.dropdown.actionTimeout);

    this.requestUpdate('_state');
  }

  render() {
    return html`
      <mc-dropdown-base
        style=${styleMap(this.dropdown.style)}
        @change=${e => this.handleChange(e)}
        .items=${this.dropdown.source}
        .icon=${this.dropdown.icon}
        .disabled="${this.dropdown.disabled}"
        .active=${this.dropdown.isActive(this._state)}
        .selected=${this._state}>
      </mc-dropdown-base>
    `;
  }

  updated(changedProps) {
    if (changedProps.has('dropdown')) {
      this._state = (this.dropdown.state !== undefined && this.dropdown.state !== null)
        ? this.dropdown.state.toString() : '';

      if (this.timer)
        clearTimeout(this.timer);

      this.requestUpdate('_state');
    }
  }

  static get styles() {
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
    `];
  }
}
