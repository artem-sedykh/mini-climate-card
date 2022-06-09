import { LitElement, html, css } from 'lit';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import buildElementDefinitions from '../utils/buildElementDefinitions';

export default class ClimateTargetTemperature extends ScopedRegistryHost(LitElement) {
  static get defineId() { return 'mc-target-temperature'; }

  static get elementDefinitions() {
    return buildElementDefinitions([
      'ha-icon',
      'ha-icon-button',
    ], ClimateTargetTemperature);
  }

  constructor() {
    super();
    this.timeout = 800;
  }

  static get properties() {
    return {
      targetTemperature: { type: Object },
    };
  }

  increment(e) {
    e.stopPropagation();
    const changed = this.targetTemperature.increment();

    if (changed) {
      this.temp_last_changed = Date.now();
      this.targetTemperatureChanged();
    }
  }

  decrement(e) {
    e.stopPropagation();

    const changed = this.targetTemperature.decrement();

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
        const { value } = this.targetTemperature;
        try {
          this.targetTemperature.update(value);
        } finally {
          this.sendChangeEvent(false);
          this.temp_last_changed = null;
        }
      }
    }, this.timeout + 10);
  }

  render() {
    if (!ClimateTargetTemperature.elementDefinitionsLoaded) {
      return html``;
    }
    if (!this.targetTemperature)
      return '';

    return html`
      <div class='controls-wrap'>
        <ha-icon-button class='temp --up'
          .icon=${this.targetTemperature.icons.up}
          @click=${e => this.increment(e)}>
          <ha-icon .icon=${this.targetTemperature.icons.up}></ha-icon>
        </ha-icon-button>
        <ha-icon-button class='temp --down'
          .icon=${this.targetTemperature.icons.down}
          @click=${e => this.decrement(e)}>
           <ha-icon .icon=${this.targetTemperature.icons.down}></ha-icon>
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
      --ha-icon-display: flex;
    }
    .temp {
      width: calc(var(--mc-unit) * .75);
      height: calc(var(--mc-unit) * .75);
      --mdc-icon-button-size: calc(var(--mc-unit) * .75);
      color: var(--mc-icon-color);
    }
    .temp.--up {
      margin-top: -2px;
    }
    .temp.--down {
      margin-top: -2px;
    }
    .temp.--down {
      margin-top: auto;
    }
    `;
  }
}
