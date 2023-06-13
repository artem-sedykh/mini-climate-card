import { LitElement, html, css } from 'lit';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import sharedStyle from '../sharedStyle';
import ClimateMenu from './mwc/menu';
import ClimateListItem from './mwc/list-item';
import buildElementDefinitions from '../utils/buildElementDefinitions';

export default class ClimateFanModeSecondary extends ScopedRegistryHost(LitElement) {
  static get defineId() { return 'mc-fan-mode-secondary'; }

  static get elementDefinitions() {
    return buildElementDefinitions([
      'ha-icon',
      ClimateMenu,
      ClimateListItem,
    ], ClimateFanModeSecondary);
  }

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
        this.requestUpdate('_selected');
      }
    }, this.fanMode.actionTimeout);

    this.fanMode.handleChange(selected.id);

    this.requestUpdate('_selected');
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
        <mwc-menu fixed activatable
            id=${'menu'}
            ?quick=${true}
            .menuCorner=${'END'}
            .corner=${'TOP_RIGHT'}
            @selected=${this.handleChange}>
          ${this.fanMode.source.map(item => html`
            <mwc-list-item value=${item.id || item.name} ?selected=${this._selected.id && this._selected.id === item.id} .activated=${this._selected.id && this._selected.id === item.id}>
              <span class='mc-dropdown__item__label'>${item.name}</span>
            </mwc-list-item>`)}
        </mwc-menu>
      </div>
    `;
  }

  render() {
    if (!ClimateFanModeSecondary.elementDefinitionsLoaded) {
      return html``;
    }

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
      this.requestUpdate('_selected');
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
    `];
  }
}
