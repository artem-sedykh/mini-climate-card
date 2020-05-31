import { LitElement, html, css } from 'lit-element';

class ClimateTargetTemperature extends LitElement {
  constructor() {
    super();
    this.timeout = 800;
  }

  static get properties() {
    return {
      target_temperature: Object,
    };
  }

  increment(e) {
    e.stopPropagation();
    const changed = this.target_temperature.increment();

    if (changed) {
      this.temp_last_changed = Date.now();
      this.targetTemperatureChanged();
    }
  }

  decrement(e) {
    e.stopPropagation();

    const changed = this.target_temperature.decrement();

    if (changed) {
      this.temp_last_changed = Date.now();
      this.targetTemperatureChanged();
    }
  }

  sendChangeEvent(changing) {
    const data = { detail: { changing } };
    const event = new CustomEvent('changing', data);
    this.dispatchEvent(event);
  }

  targetTemperatureChanged() {
    if (!this.temp_last_changed)
      return;

    this.sendChangeEvent(true);

    window.setTimeout(() => {
      const now = Date.now();
      if (now - this.temp_last_changed >= this.timeout) {
        const { value } = this.target_temperature;
        try {
          this.target_temperature.update(value);
        } finally {
          this.sendChangeEvent(false);
          this.temp_last_changed = null;
        }
      }
    }, this.timeout + 10);
  }

  render() {
    if (!this.target_temperature)
      return '';

    return html`
      <div class='controls-wrap'>
        <ha-icon-button class='temp --up'
          .icon=${this.target_temperature.icons.up}
          @click=${e => this.increment(e)}>
        </ha-icon-button>
        <ha-icon-button class='temp --down'
          .icon=${this.target_temperature.icons.down}
          @click=${e => this.decrement(e)}>
        </ha-icon-button>
      </div>
    `;
  }

  static get styles() {
    return css`
    .controls-wrap {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .temp {
      width: calc(var(--mc-unit) * .75);
      height: calc(var(--mc-unit) * .75);
      --mdc-icon-button-size: calc(var(--mc-unit) * .75);
      color: var(--mc-icon-color);
    }
    .temp.--down {
      margin-top: calc(var(--mc-unit) * -.05);
    }
    .temp.--down {
      margin-top: auto;
    }
    `;
  }
}

customElements.define('mc-target-temperature', ClimateTargetTemperature);
