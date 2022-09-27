import { LitElement, html, css } from 'lit';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import buildElementDefinitions from '../utils/buildElementDefinitions';
import { NO_TARGET_TEMPERATURE } from '../const';

export default class ClimateTemperature extends ScopedRegistryHost(LitElement) {
  static get defineId() { return 'mc-temperature'; }

  static get elementDefinitions() {
    return buildElementDefinitions([], ClimateTemperature);
  }

  static get properties() {
    return {
      temperature: Object,
      changing: Boolean,
      target: Number,
      swapTemperatures: Boolean,
      hideCurrentTemperature: Boolean,
    };
  }

  get targetStr() {
    const targetStr = this.target.toString();
    const targetNum = parseFloat(targetStr);
    if (Number.isNaN(targetNum) || targetStr === NO_TARGET_TEMPERATURE) {
      return NO_TARGET_TEMPERATURE;
    }
    const parts = this.temperature.step.toString().split('.');
    return parts[1]
      ? targetNum.toFixed(parts[1].length)
      : targetStr;
  }

  renderTemperature() {
    if (this.temperature.value === undefined || this.hideCurrentTemperature)
      return '';

    if (this.swapTemperatures) {
      return html`
        <span class='state__value'>${this.temperature.value}</span>
        <span class='state__value'>/</span>`;
    }

    return html`
      <span class='state__value'>/</span>
      <span class='state__value'>${this.temperature.value}</span>`;
  }

  render() {
    if (!ClimateTemperature.elementDefinitionsLoaded) {
      return html``;
    }

    if (!this.temperature) {
      return html``;
    }

    const cls = this.changing ? 'changing' : '';
    const { unit } = this.temperature;
    if (this.swapTemperatures) {
      return html`
      <div class='state ellipsis'>
        ${this.renderTemperature()}
        <span class='state__value ${cls}'>${this.targetStr}</span>
        <span class='state__uom'>${unit}</span>
      </div>`;
    }

    return html`
    <div class='state ellipsis'>
      <span class='state__value ${cls}'>${this.targetStr}</span>
      ${this.renderTemperature()}
      <span class='state__uom'>${unit}</span>
    </div>
    `;
  }

  static get styles() {
    return css`
    .state {
      margin-top:calc(var(--mc-unit) * .15);
    }
    .state__value {
      font-weight: var(--mc-info-font-weight);
      line-height: calc(var(--mc-unit) * .475);
      font-size: calc(var(--mc-unit) * .475);
    }
    .state__uom {
      font-size: calc(var(--mc-unit) * 0.35);
      font-weight: var(--mc-name-font-weight);
      opacity: 0.6;
      line-height: calc(var(--mc-unit) * 0.475);
    }
    .ellipsis {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .changing {
      color: var(--mc-accent-color);
    }
    `;
  }
}
