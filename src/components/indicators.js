import { LitElement, html, css } from 'lit-element';

import { styleMap } from 'lit-html/directives/style-map';

import { round } from '../utils/utils';

class ClimateIndicators extends LitElement {
  static get properties() {
    return {
      indicators: {},
      state: {},
      climate: {},
    };
  }

  renderIcon(indicator, state) {
    let indicatorIcon = '';
    let style;

    if (indicator.functions.icon && indicator.functions.icon.template) {
      indicatorIcon = indicator.functions.icon.template(state.value, state.entity,
        this.climate.entity, this.climate.mode);
    } else if (indicator.icon && typeof indicator.icon === 'string') {
      indicatorIcon = indicator.icon;
    }

    if (indicator.functions.icon && indicator.functions.icon.style)
      style = indicator.functions.icon.style(state.value, state.entity,
        this.climate.entity, this.climate.mode);

    if (!indicatorIcon)
      return '';

    return html`<ha-icon style=${styleMap(style || {})} class='state__value_icon' .icon=${indicatorIcon}></ha-icon>`;
  }

  renderUnit(unit) {
    if (!unit)
      return '';

    return html`<span class='state__uom'>${unit}</span>`;
  }

  renderIndicator(indicator) {
    const state = this.state[indicator.id];

    if (!state)
      return '';

    let value = state.originalValue;

    if (indicator.functions.mapper) {
      value = indicator.functions.mapper(value, state.entity,
        this.climate.entity, this.climate.mode);
    }

    state.value = value;

    if ('round' in indicator && Number.isNaN(value) === false)
      value = round(value, indicator.round);

    return html`
       <div class='state'>
         ${this.renderIcon(indicator, state)}
         <span class='state__value'>${value}</span>
         ${this.renderUnit(indicator.unit)}
       </div>
    `;
  }

  render() {
    const context = this;

    return html`
     <div class='mc-indicators__container'>
       ${this.indicators.map(i => context.renderIndicator(i))}
     </div>
    `;
  }

  static get styles() {
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
     .humidity .state__value {
        margin: 0;
     }
    `;
  }
}

customElements.define('mc-indicators', ClimateIndicators);
