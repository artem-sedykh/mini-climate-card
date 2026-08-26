import define from '../utils/define';
import { LitElement, html, css, type PropertyDeclarations, type TemplateResult } from 'lit';
import { NO_TARGET_TEMPERATURE } from '../const';
import type TemperatureObject from '../models/temperature';

export default class ClimateTemperature extends LitElement {
  temperature!: TemperatureObject;

  changing!: boolean;

  target!: number | string;

  swapTemperatures!: boolean;

  // `{ type: X }` rather than the bare constructor this used to name. lit
  // reads `type` off the declaration; a constructor has no such property, so
  // every one of these was declared with the defaults instead - see #230.
  static override get properties(): PropertyDeclarations {
    return {
      temperature: { type: Object },
      changing: { type: Boolean },
      target: { type: Number },
      swapTemperatures: { type: Boolean },
    };
  }

  get targetStr() {
    const targetStr = this.target.toString();
    const targetNum = parseFloat(targetStr);
    if (Number.isNaN(targetNum) || targetStr === NO_TARGET_TEMPERATURE) {
      return NO_TARGET_TEMPERATURE;
    }
    const parts = this.temperature.step.toString().split('.');
    return parts[1] ? targetNum.toFixed(parts[1].length) : targetStr;
  }

  renderTemperature(): TemplateResult | string {
    if (this.temperature.value === undefined || this.temperature.hide) return '';

    if (this.swapTemperatures) {
      return html`
        <span class='state__value'>${this.temperature.value}</span>
        <span class='state__value'>/</span>`;
    }

    return html`
      <span class='state__value'>/</span>
      <span class='state__value'>${this.temperature.value}</span>`;
  }

  override render(): TemplateResult {
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

  static override get styles() {
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

define('mc-temperature', ClimateTemperature);
