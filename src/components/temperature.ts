import define from '../utils/define';
import { LitElement, html, css, type PropertyDeclarations, type TemplateResult } from 'lit';
import { NO_TARGET_TEMPERATURE } from '../const';
import handleClick from '../utils/handleClick';
import type { TapAction } from '../types';
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

  /**
   * A reading is clickable only when it was configured to be (#65). The card
   * draws `cursor: pointer` off the same answer, because a card that opted out
   * inviting a tap is the half of the bug the sister card had in #206.
   */
  static clickable(action: TapAction): boolean {
    return !!action && !!action.action && action.action !== 'none';
  }

  handleTap(e: Event, action: TapAction, entityId: string): void {
    if (!ClimateTemperature.clickable(action)) return;

    // The card's own `tap_action` is on the name, which is a different
    // subtree, so nothing above listens for this - stopped for the reason
    // `handlePopup` stops it, rather than for a conflict that exists today.
    e.stopPropagation();
    handleClick(this, this.temperature.hass, action, entityId);
  }

  renderValue(
    value: unknown,
    action: TapAction,
    entityId: string,
    changing = false,
  ): TemplateResult {
    const clickable = ClimateTemperature.clickable(action);
    const cls = ['state__value', changing ? 'changing' : '', clickable ? 'clickable' : '']
      .filter(Boolean)
      .join(' ');

    return html`<span
      class='${cls}'
      @click=${(e: Event) => this.handleTap(e, action, entityId)}>${value}</span>`;
  }

  renderTemperature(): TemplateResult | string {
    if (this.temperature.value === undefined || this.temperature.hide) return '';

    return this.renderValue(
      this.temperature.value,
      this.temperature.tapAction,
      this.temperature.entityId,
    );
  }

  renderTarget(): TemplateResult {
    return this.renderValue(
      this.targetStr,
      this.temperature.targetTapAction,
      this.temperature.targetEntityId,
      this.changing,
    );
  }

  override render(): TemplateResult {
    if (!this.temperature) {
      return html``;
    }

    const { unit } = this.temperature;
    const current = this.renderTemperature();
    // No reading, no separator: hiding the current temperature has always left
    // the target alone with its unit.
    const separator = current === '' ? '' : html`<span class='state__value'>/</span>`;
    const [first, second] = this.swapTemperatures
      ? [current, this.renderTarget()]
      : [this.renderTarget(), current];

    return html`
    <div class='state ellipsis'>
      ${first}
      ${separator}
      ${second}
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
    .clickable {
      cursor: pointer;
    }
    `;
  }
}

define('mc-temperature', ClimateTemperature);
