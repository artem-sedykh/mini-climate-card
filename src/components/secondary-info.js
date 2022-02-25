import { LitElement, html, css } from 'lit';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import FanModeSecondary from './fan-mode-secondary';
import sharedStyle from '../sharedStyle';

export default class SecondaryInfo extends ScopedRegistryHost(LitElement) {
  static get elementDefinitions() {
    return {
      'ha-icon': customElements.get('ha-icon'),
      'ha-relative-time': customElements.get('ha-relative-time'),
      'mc-fan-mode-secondary': FanModeSecondary,
    };
  }

  constructor() {
    super();
    this.fanMode = {};
    this.hvacMode = {};
    this.config = {};
    this.climate = {};
  }

  static get properties() {
    return {
      fanMode: { type: Object },
      config: { type: Object },
      hvacMode: { type: Object },
      climate: { type: Object },
    };
  }

  renderHvacAction() {
    const action = this.climate.hvacAction;
    if (!action)
      return '';

    const icon = action.icon ? action.icon : this.config.secondary_info.icon;
    const cls = icon ? '' : 'gray';

    return html`
        ${icon ? html`<ha-icon class='icon' .icon=${icon}></ha-icon>` : ''}
         <span class='name ${cls}'>${action.name}</span>
      `;
  }

  renderHvacMode() {
    const { hvacMode } = this;
    const mode = hvacMode.selected || {};
    const icon = mode.icon ? mode.icon : this.config.secondary_info.icon;

    return html`
        ${icon ? html`<ha-icon class='icon' .icon=${icon}></ha-icon>` : ''}
         <span class='name'>${mode.name}</span>
      `;
  }

  render() {
    const { type } = this.config.secondary_info;

    switch (type) {
      case 'hvac-mode':
        return this.renderHvacMode();
      case 'hvac-action':
        return this.renderHvacAction();
      case 'last-changed':
        return html`<ha-relative-time .hass=${this.climate.hass} .datetime=${this.climate.lastChanged}></ha-relative-time>`;
      default:
        return html`<mc-fan-mode-secondary .fanMode=${this.fanMode} .config=${this.config}></mc-fan-mode-secondary>`;
    }
  }

  static get styles() {
    return [
      sharedStyle,
      css`
      ha-relative-time, .gray {
        color: #727272;
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
