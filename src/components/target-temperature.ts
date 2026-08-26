import define from '../utils/define';
import type TargetTemperatureObject from '../models/target-temperature';
import { LitElement, html, css, type TemplateResult } from 'lit';

export default class ClimateTargetTemperature extends LitElement {
  targetTemperature!: TargetTemperatureObject;

  /** How long the control waits after the last press before it sends. */
  timeout: number;

  /** When the last press was, or null once what it added up to has been sent. */
  temp_last_changed: number | null | undefined;

  constructor() {
    super();
    this.timeout = 800;
  }

  static override get properties() {
    return {
      targetTemperature: { type: Object },
    };
  }

  increment(e: Event): void {
    e.stopPropagation();
    const changed = this.targetTemperature.increment();

    if (changed) {
      this.temp_last_changed = Date.now();
      this.targetTemperatureChanged();
    }
  }

  decrement(e: Event): void {
    e.stopPropagation();

    const changed = this.targetTemperature.decrement();

    if (changed) {
      this.temp_last_changed = Date.now();
      this.targetTemperatureChanged();
    }
  }

  sendChangeEvent(changing: boolean): void {
    const data = { detail: { changing } };
    const event = new CustomEvent('changing', data);
    this.dispatchEvent(event);
  }

  targetTemperatureChanged(): void {
    if (!this.temp_last_changed) return;

    this.sendChangeEvent(true);

    window.setTimeout(() => {
      // Every press schedules one of these, and the last one to arrive is the
      // one that sends. `temp_last_changed` is cleared once that has happened,
      // so a timer that arrives afterwards has nothing left to do - without
      // this line it compared against `null`, read the whole epoch as elapsed
      // time and sent the same temperature to the device again.
      if (!this.temp_last_changed) return;

      if (Date.now() - this.temp_last_changed < this.timeout) return;

      const { value } = this.targetTemperature;
      try {
        this.targetTemperature.update(value);
      } finally {
        this.sendChangeEvent(false);
        this.temp_last_changed = null;
      }
    }, this.timeout + 10);
  }

  override render(): TemplateResult | string {
    if (!this.targetTemperature) return '';

    return html`
      <div class='controls-wrap'>
        <ha-icon-button class='temp --up'
          .icon=${this.targetTemperature.icons.up}
          @click=${(e: Event) => this.increment(e)}>
          <ha-icon .icon=${this.targetTemperature.icons.up}></ha-icon>
        </ha-icon-button>
        <ha-icon-button class='temp --down'
          .icon=${this.targetTemperature.icons.down}
          @click=${(e: Event) => this.decrement(e)}>
           <ha-icon .icon=${this.targetTemperature.icons.down}></ha-icon>
        </ha-icon-button>
      </div>
    `;
  }

  static override get styles() {
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
      --ha-icon-button-size: calc(var(--mc-unit) * .75);
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

define('mc-target-temperature', ClimateTargetTemperature);
