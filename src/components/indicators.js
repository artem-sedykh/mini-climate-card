import { LitElement, html, css } from 'lit-element';

import { styleMap } from 'lit-html/directives/style-map';
import handleClick from '../utils/handleClick';
import { TAP_ACTIONS } from '../const';

class ClimateIndicators extends LitElement {
  static get properties() {
    return {
      indicators: { type: Object },
      hass: { type: Object },
    };
  }

  handlePopup(e, indicator) {
    e.stopPropagation();
    handleClick(this, this.hass, indicator.config.tap_action, indicator.entity.entity_id);
  }

  renderIcon(indicator) {
    const { icon } = indicator;

    if (!icon)
      return '';

    return html`<ha-icon style=${styleMap(indicator.iconStyle)} class='state__value_icon' .icon=${icon}></ha-icon>`;
  }

  renderUnit(unit) {
    if (!unit)
      return '';

    return html`<span class='state__uom'>${unit}</span>`;
  }

  renderIndicator(indicator) {
    if (!indicator)
      return '';
    const action = indicator.config && indicator.config.tap_action
      && indicator.config.tap_action.action;
    const cls = action && TAP_ACTIONS.includes(action) ? 'pointer' : '';

    return html`
       <div class='state ${cls}' @click=${e => this.handlePopup(e, indicator)}>
         ${this.renderIcon(indicator)}
         <span class='state__value'>${indicator.value}</span>
         ${this.renderUnit(indicator.unit)}
       </div>
    `;
  }

  render() {
    const context = this;

    return html`
     <div class='mc-indicators__container'>
       ${Object.entries(this.indicators).map(i => context.renderIndicator(i[1]))}
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

customElements.define('mc-indicators', ClimateIndicators);
