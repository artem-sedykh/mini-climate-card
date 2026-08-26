import define from '../utils/define';
import { LitElement, html, css } from 'lit';
import sharedStyle from '../sharedStyle';
import './menu';

export default class ClimateFanModeSecondary extends LitElement {
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
    const { index } = e.detail;

    if (index === this.selectedIndex || !this.fanMode.source[index]) return;

    clearTimeout(this.timer);

    const selected = this.fanMode.source[index];
    const { entity } = this.fanMode;
    const oldSelected = this._selected;
    this._selected = selected;

    this.timer = setTimeout(async () => {
      if (this.fanMode.entity === entity) {
        this._selected = oldSelected;
        this.requestUpdate('_selected');
      }
    }, this.fanMode.actionTimeout);

    this.fanMode.handleChange(selected.id);

    this.requestUpdate('_selected');
  }

  renderFanMode() {
    const label = this._selected ? this._selected.name : this.fanMode.state;
    const icon = this.config.secondary_info.icon
      ? this.config.secondary_info.icon
      : this.fanMode.icon;

    return html`
       <ha-icon class='icon' .icon=${icon}></ha-icon>
       <span class='name'>${label}</span>
    `;
  }

  handleClick() {
    const menu = this.shadowRoot.querySelector('#menu');
    menu.anchor = this.shadowRoot.querySelector('#button');
    menu.show();
  }

  renderFanModeDropdown() {
    return html`
      <div class='mc-dropdown'>
        <ha-icon-button class='mc-dropdown__button icon'
          id=${'button'}
          @click=${this.handleClick}
          ?disabled=${this.fanMode.disabled}
        >
          ${this.renderFanMode()}
        </ha-icon-button>
        <mc-menu
          id=${'menu'}
          .items=${this.fanMode.source}
          .selected=${this._selected.id}
          @selected=${this.handleChange}
        ></mc-menu>
      </div>
    `;
  }

  render() {
    const { type } = this.config.secondary_info;

    if (type === 'fan-mode-dropdown') {
      return this.renderFanModeDropdown();
    }

    return this.renderFanMode();
  }

  // See the note in button.js: derived before the render rather than after
  // it, so one state change costs one pass.
  willUpdate(changedProps) {
    if (changedProps.has('fanMode')) {
      clearTimeout(this.timer);
      this._selected = this.fanMode.selected;
    }
  }

  static get styles() {
    return [
      sharedStyle,
      css`
      .mc-dropdown {
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
    `,
    ];
  }
}

define('mc-fan-mode-secondary', ClimateFanModeSecondary);
