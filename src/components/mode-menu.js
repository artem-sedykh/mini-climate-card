import { LitElement, html, css } from 'lit';
import { styleMap } from 'lit/directives/style-map';
import './dropdown-base';
import ICON from '../const';

class ModeMenu extends LitElement {
  constructor() {
    super();
    this.mode = {};
  }

  static get properties() {
    return {
      mode: { type: Object },
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
    return this.mode.source.find(i => i.id === this.mode.state) || {};
  }

  get sources() {
    return this.mode.source
      .filter(s => !s.hide)
      .map(s => ({ name: s.name, id: s.id, type: 'source' }));
  }

  handleChange(e) {
    e.stopPropagation();
    const selected = e.detail.id;
    this.mode.handleChange(selected);
  }

  render() {
    return html`
      <mc-dropdown-base
        @change=${this.handleChange}
        .items=${this.sources}
        .icon=${this.calcIcon}
        style=${styleMap(this.mode.style)}
        .active=${this.mode.isActive(this.mode.state)}
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
