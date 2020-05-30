import { LitElement, html, css } from 'lit-element';

class ClimateTemperature extends LitElement {
  constructor() {
    super();
    this.targetTemperature = {
      value: 0,
      inFlux: false,
      step: 1,
      unit: '',
    };

    this.temperature = 0;
  }

  static get properties() {
    return {
      targetTemperature: Object,
      temperature: Number,
    };
  }

  get targetTemperatureStr() {
    const { step } = this.targetTemperature;
    const s = step.toString().split('.');
    return s[1]
      ? parseFloat(this.targetTemperature.value).toFixed(s[1].length)
      : this.targetTemperature.value;
  }

  renderTemperature() {
    if (this.temperature === undefined)
      return '';

    return html`
      <span class='state__value'>/</span>
      <span class='state__value'>${this.temperature}</span>`;
  }

  render() {
    const cls = this.targetTemperature.inFlux ? 'in-flux' : '';
    const { unit } = this.targetTemperature;

    return html`
    <div class='state ellipsis'>
      <span class='state__value ${cls}'>${this.targetTemperatureStr}</span>
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
    .in-flux {
      color: var(--mc-accent-color);
    }
    `;
  }
}

customElements.define('mc-temperature', ClimateTemperature);
