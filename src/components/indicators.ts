import define from '../utils/define';
import { LitElement, html, css, type TemplateResult } from 'lit';

import { styleMap } from 'lit/directives/style-map.js';
import handleClick from '../utils/handleClick';
import { TAP_ACTIONS } from '../const';
import type IndicatorObject from '../models/indicator';

export default class ClimateIndicators extends LitElement {
  indicators!: Record<string, IndicatorObject>;

  static override get properties() {
    return {
      indicators: { type: Object },
    };
  }

  handlePopup(e: Event, indicator: IndicatorObject): void {
    e.stopPropagation();
    handleClick(this, indicator.hass, indicator.config.tap_action, indicator.entity.entity_id);
  }

  renderIcon(indicator: IndicatorObject): TemplateResult | string {
    const { icon } = indicator;

    if (!icon) return '';

    return html`<ha-icon style=${styleMap(indicator.iconStyle)} class='state__value_icon' .icon=${icon}></ha-icon>`;
  }

  renderUnit(indicator: IndicatorObject): TemplateResult | string {
    if (!indicator.unit) return '';

    return html`<span class='state__uom' style=${styleMap(indicator.valueStyle)}>${indicator.unit}</span>`;
  }

  renderIndicator(indicator: IndicatorObject): TemplateResult | string {
    if (!indicator) return '';
    const action =
      indicator.config && indicator.config.tap_action && indicator.config.tap_action.action;
    const cls = action && TAP_ACTIONS.includes(action) ? 'pointer' : '';

    return html`
       <div class='state ${cls}' @click=${(e: Event) => this.handlePopup(e, indicator)}>
         ${this.renderIcon(indicator)}
         <span class='state__value' style=${styleMap(indicator.valueStyle)}>${indicator.value}</span>
         ${this.renderUnit(indicator)}
       </div>
    `;
  }

  override render(): TemplateResult {
    const indicatorsToShow = Object.entries(this.indicators)
      .map(entry => entry[1])
      .filter(indicator => !indicator.hide);

    return html`
     <div class='mc-indicators__container'>
       ${indicatorsToShow.map(i => this.renderIndicator(i))}
     </div>
    `;
  }

  static override get styles() {
    return css`
     :host {
        position: relative;
        box-sizing: border-box;
        font-size: calc(var(--mc-unit) * .35);
        line-height: calc(var(--mc-unit) * .35);
      }
     .mc-indicators__container {
       display: flex;
       flex-wrap: wrap;
       margin-right: calc(var(--mc-unit) * .075);
     }
     .state {
        position: relative;
        display: flex;
        flex-wrap: nowrap;
        margin-right: calc(var(--mc-unit) * .1);
     }
     .pointer {
        cursor: pointer
     }
     .state__value_icon {
        height: calc(var(--mc-unit) * .475);
        width: calc(var(--mc-unit) * .5);
        color: var(--mc-icon-color);
        --mdc-icon-size: calc(var(--mc-unit) * 0.5);
     }
     .state__value {
        margin: 0 1px;
        font-weight: var(--mc-info-font-weight);
        line-height: calc(var(--mc-unit) * .475);
     }
     .state__uom {
        font-size: calc(var(--mc-unit) * .275);
        line-height: calc(var(--mc-unit) * .525);
        margin-left: 1px;
        height: calc(var(--mc-unit) * .475);
        opacity: 0.8;
     }
    `;
  }
}

define('mc-indicators', ClimateIndicators);
