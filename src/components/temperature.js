import { LitElement, html, css } from 'lit';

class ClimateTemperature extends LitElement {
  static get properties() {
    return {
      temperature: Object,
      changing: Boolean,
      target: Number,
    };
  }

  get targetStr() {
    const parts = this.temperature.step.toString().split('.');
    return parts[1]
      ? parseFloat(this.target.toString()).toFixed(parts[1].length)
      : this.target;
  }

  renderTemperature() {
    if (this.temperature.value === undefined)
      return '';

    return html`
      <span class='state__value'>/</span>
      <span class='state__value'>${this.temperature.value}</span>`;
  }

  render() {
    if (!this.temperature)
      return '';

    const cls = this.changing ? 'changing' : '';
    const { unit } = this.temperature;

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

customElements.define('mc-temperature', ClimateTemperature);
