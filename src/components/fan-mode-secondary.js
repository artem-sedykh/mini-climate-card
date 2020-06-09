import { LitElement, html, css } from 'lit-element';
import sharedStyle from '../sharedStyle';

class FanModeSecondary extends LitElement {
  constructor() {
    super();
    this.fanMode = {};
    this.config = {};
    this.timer = undefined;
    this._selected = {};
    this.source = {};
  }

  static get properties() {
    return {
      fanMode: { type: Object },
      config: { type: Object },
    };
  }

  get selectedIndex() {
    return this.fanMode.source.map(item => item.id).indexOf(this._selected.id);
  }

  handleChange(e) {
    const index = e.target.selected;

    if (index === this.selectedIndex || !this.fanMode.source[index])
      return;

    clearTimeout(this.timer);

    const selected = this.fanMode.source[index];
    const { entity } = this.fanMode;
    const oldSelected = this._selected;
    this._selected = selected;

    this.timer = setTimeout(async () => {
      if (this.fanMode.entity === entity) {
        this._selected = oldSelected;
        return this.requestUpdate('_selected');
      }
    }, this.fanMode.actionTimeout);

    this.fanMode.handleChange(selected.id);

    return this.requestUpdate('_selected');
  }

  renderFanMode() {
    const label = this._selected ? this._selected.name : this.fanMode.state;
    const icon = this.config.secondary_info.icon ? this.config.secondary_info.icon
      : this.fanMode.icon;

    return html`
       <ha-icon class='icon' .icon=${icon}></ha-icon>
       <span class='name'>${label}</span>
    `;
  }

  renderFanModeDropdown() {
    return html`
       <paper-menu-button
        class='mc-dropdown'
        noink no-animations
        .horizontalAlign=${'right'}
        .verticalAlign=${'top'}
        .verticalOffset=${44}
        ?disabled=${this.fanMode.disabled}
        .dynamicAlign=${true}>
       <div class="wrap" slot='dropdown-trigger'>
         ${this.renderFanMode()}
       </div>
        <paper-listbox slot="dropdown-content" .selected=${this.selectedIndex} @iron-select=${this.handleChange}>
          ${this.fanMode.source.map(item => html`
            <paper-item value=${item.id || item.name}>
              <span class='mc-dropdown__item__label'>${item.name}</span>
            </paper-item>`)}
        </paper-listbox>
      </paper-menu-button>
    `;
  }

  render() {
    const { type } = this.config.secondary_info;

    if (type === 'fan-mode-dropdown') {
      return this.renderFanModeDropdown();
    }

    return this.renderFanMode();
  }

  updated(changedProps) {
    if (changedProps.has('fanMode')) {
      clearTimeout(this.timer);
      this._selected = this.fanMode.selected;
      this.requestUpdate('_selected').then();
    }
  }

  static get styles() {
    return [
      sharedStyle,
      css`
      paper-menu-button {
        padding: 0;
      }
      .name {
        font-size: calc(var(--mc-unit) * .35);
        font-weight: var(--mc-info-font-weight);
        line-height: calc(var(--mc-unit) * .5);
        vertical-align: middle;
        display: inline-block;
      }
      .icon {
        color: var(--mc-icon-color);
        height: calc(var(--mc-unit) * .475);
        width: calc(var(--mc-unit) * .5);
        min-width: calc(var(--mc-unit) * .5);
        --mdc-icon-size: calc(var(--mc-unit) * 0.5);
      }
    `];
  }
}

customElements.define('mc-fan-mode-secondary', FanModeSecondary);
