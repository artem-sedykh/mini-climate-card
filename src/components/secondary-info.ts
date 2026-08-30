import define from '../utils/define';
import { LitElement, html, css, type TemplateResult } from 'lit';
import './fan-mode-secondary';
import sharedStyle from '../sharedStyle';
import type ButtonObject from '../models/button';
import type ClimateObject from '../models/climate';
import type HvacModeObject from '../models/hvac-mode';
import type { CardConfig, SourceItem } from '../types';

export default class ClimateSecondaryInfo extends LitElement {
  fanMode!: ButtonObject;

  hvacMode!: HvacModeObject;

  config!: CardConfig;

  climate!: ClimateObject;

  constructor() {
    super();
    this.fanMode = {} as ButtonObject;
    this.hvacMode = {} as HvacModeObject;
    this.config = {} as CardConfig;
    this.climate = {} as ClimateObject;
  }

  static override get properties() {
    return {
      fanMode: { type: Object },
      config: { type: Object },
      hvacMode: { type: Object },
      climate: { type: Object },
    };
  }

  renderHvacAction(): TemplateResult | string {
    const action = this.climate.hvacAction;
    if (!action) return '';

    const icon = action.icon ? action.icon : this.config.secondary_info.icon;
    const cls = icon ? '' : 'gray';

    return html`
        ${icon ? html`<ha-icon class='icon' .icon=${icon}></ha-icon>` : ''}
         <span class='name ${cls}'>${action.name}</span>
      `;
  }

  renderHvacMode(): TemplateResult {
    const { hvacMode } = this;
    const mode = hvacMode.selected || ({} as SourceItem);
    const icon = mode.icon ? mode.icon : this.config.secondary_info.icon;

    return html`
        ${icon ? html`<ha-icon class='icon' .icon=${icon}></ha-icon>` : ''}
         <span class='name'>${mode.name}</span>
      `;
  }

  override render(): TemplateResult | string {
    const { type } = this.config.secondary_info;

    switch (type) {
      case 'hvac-mode':
        return this.renderHvacMode();
      case 'hvac-mode-dropdown':
        return html`<mc-fan-mode-secondary .fanMode=${this.hvacMode} .config=${this.config}></mc-fan-mode-secondary>`;
      case 'hvac-action':
        return this.renderHvacAction();
      case 'last-changed':
        return html`<ha-relative-time .hass=${this.climate.hass} .datetime=${this.climate.lastChanged}></ha-relative-time>`;
      case 'last-updated':
        return html`<ha-relative-time .hass=${this.climate.hass} .datetime=${this.climate.lastUpdated}></ha-relative-time>`;
      default:
        return html`<mc-fan-mode-secondary .fanMode=${this.fanMode} .config=${this.config}></mc-fan-mode-secondary>`;
    }
  }

  static override get styles() {
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
    `,
    ];
  }
}

define('mc-secondary-info', ClimateSecondaryInfo);
