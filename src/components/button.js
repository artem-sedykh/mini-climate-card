import { LitElement, html, css } from 'lit-element';
import { styleMap } from 'lit-html/directives/style-map';
import sharedStyle from '../sharedStyle';

class ClimateButton extends LitElement {
  constructor() {
    super();
    this._isOn = false;
    this.timer = undefined;
  }

  static get properties() {
    return {
      button: { type: Object },
    };
  }

  handleToggle(e) {
    e.stopPropagation();
    const { entity } = this.button;

    this._isOn = !this._isOn;
    this.button.handleToggle();

    if (this.timer)
      clearTimeout(this.timer);

    this.timer = setTimeout(async () => {
      if (this.button.entity === entity) {
        this._isOn = this.button.isOn;
        return this.requestUpdate('_isOn');
      }
    }, this.button.actionTimeout);
    return this.requestUpdate('_isOn');
  }

  render() {
    return html`
       <ha-icon-button
         style=${styleMap(this.button.style)}
         .icon=${this.button.icon}
         @click=${e => this.handleToggle(e)}
         ?disabled="${this.button.disabled || this.button.isUnavailable}"
         ?color=${this._isOn}>
        </ha-icon-button>
    `;
  }

  updated(changedProps) {
    if (changedProps.has('button')) {
      this._isOn = this.button.isOn;

      if (this.timer)
        clearTimeout(this.timer);

      return this.requestUpdate('_isOn');
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

customElements.define('mc-button', ClimateButton);
