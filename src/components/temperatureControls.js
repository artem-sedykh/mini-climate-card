import { LitElement, html, css } from 'lit-element';

class ClimateTemperatureControls extends LitElement {
  constructor() {
    super();
    this.targetTemperature = {
      value: 0,
      min: 0,
      max: 0,
      step: 0,
      inFlux: false,
    };
    this.timeout = 800;
  }

  static get properties() {
    return {
      const: Object,
      targetTemperature: Object,
      climate: Object,
    };
  }

  increment(e) {
    e.stopPropagation();
    const { step } = this.targetTemperature;
    const { min } = this.targetTemperature;
    const { max } = this.targetTemperature;
    const oldValue = this.targetTemperature.value;

    const newVal = this._roundTemp(this.targetTemperature.value + step);
    if (this.targetTemperature.value < max) {
      this.temp_last_changed = Date.now();
    }
    if (newVal <= max) {
      if (newVal <= min) {
        this.targetTemperature.value = min;
      } else {
        this.targetTemperature.value = newVal;
      }
    } else {
      this.targetTemperature.value = max;
    }

    if (oldValue !== this.targetTemperature.value) {
      this._update();
    }
  }

  decrement(e) {
    e.stopPropagation();
    const { step } = this.targetTemperature;
    const { min } = this.targetTemperature;
    const oldValue = this.targetTemperature.value;

    const newVal = this._roundTemp(this.targetTemperature.value - step);
    if (this.targetTemperature.value > min) {
      this.temp_last_changed = Date.now();
    }
    if (newVal >= min) {
      this.targetTemperature.value = newVal;
    } else {
      this.targetTemperature.value = min;
    }

    if (oldValue !== this.targetTemperature.value) {
      this._update();
    }
  }

  _roundTemp(val) {
    const { step } = this.targetTemperature;
    const s = step.toString().split('.');
    return s[1] ? parseFloat(val.toFixed(s[1].length)) : Math.round(val);
  }

  targetTemperatureChanged() {
    if (!this.temp_last_changed)
      return;

    window.setTimeout(() => {
      const now = Date.now();
      if (now - this.temp_last_changed >= this.timeout) {
        this.climate.setTargetTemperature(this.targetTemperature.value).then(() => {
          this.targetTemperature.inFlux = false;
          this.sendChangeEvent();
        });
        this.temp_last_changed = null;
      }
    }, this.timeout + 10);
  }

  sendChangeEvent() {
    const event = new CustomEvent('changed', { detail: { targetTemperature: this.targetTemperature } });
    this.dispatchEvent(event);
  }

  _update() {
    this.targetTemperature.inFlux = true;
    this.sendChangeEvent();
    this.targetTemperatureChanged();
  }

  render() {
    return html`
      <div class='controls-wrap'>
        <ha-icon-button class='temp --up'
          .icon=${this.config.icons.up}
          @click=${e => this.increment(e)}>
        </ha-icon-button>
        <ha-icon-button class='temp --down'
          .icon=${this.config.icons.down}
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

customElements.define('mc-temperature-controls', ClimateTemperatureControls);
