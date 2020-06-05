import { LitElement, html, css } from 'lit-element';
import { styleMap } from 'lit-html/directives/style-map';
import './dropdown-base';
import ICON from '../const';

class ModeMenu extends LitElement {
  constructor() {
    super();
    this.climate = {};
  }

  static get properties() {
    return {
      climate: { type: Object },
    };
  }

  get calcIcon() {
    if (this.selected) {
      if (this.selected.icon)
        return this.selected.icon;

      if (this.selected.id !== undefined && this.selected.id !== null) {
        const id = this.selected.id.toString().toUpperCase();

        if (id in ICON)
          return ICON[id];
      }
    }

    return '';
  }

  get selected() {
    return this.climate.mode || {};
  }

  get sources() {
    return this.climate.hvac_modes
      .filter(s => !s.hide)
      .map(s => ({ name: s.name, id: s.id, type: 'source' }));
  }

  handleChange(e) {
    e.stopPropagation();
    const selected = e.detail.id;
    this.climate.setHvacMode(selected);
  }

  render() {
    let style = {};
    if (this.climate.config.hvac_mode.functions.style)
      style = this.climate.config.hvac_mode.functions.style(this.climate.mode.id,
        this.climate.entity) || {};

    return html`
      <mc-dropdown-base
        @change=${this.handleChange}
        .climate=${this.climate}
        .items=${this.sources}
        .icon=${this.calcIcon}
        style=${styleMap(style)}
        .active=${this.climate.isOn} 
        .selected=${this.selected.id}>
      </mc-dropdown-base>
    `;
  }

  static get styles() {
    return css`
      :host {
        min-width: calc(var(--mc-unit) * .85);
        --mc-dropdown-unit: calc(var(--mc-unit) * .75);
        --paper-item-min-height: var(--mc-unit);
      }
    `;
  }
}

customElements.define('mc-mode-menu', ModeMenu);
