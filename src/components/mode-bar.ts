import define from '../utils/define';
import { LitElement, html, css, type PropertyValues, type TemplateResult } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import ICON from '../const';
import sharedStyle from '../sharedStyle';
import type HvacModeObject from '../models/hvac-mode';
import type { SourceItem } from '../types';

/**
 * The hvac modes as a row of segmented buttons, the selected one filled in -
 * the mode picker of `layout: two-row`. It reads the same `HvacModeObject` the
 * control-row dropdown (`mode-menu.ts`) does, so `hvac_mode.source`, its
 * `hide`, `order` and `icon` per item, and `change_action` all apply here too.
 */
export default class ClimateModeBar extends LitElement {
  mode!: HvacModeObject;

  private timer: ReturnType<typeof setTimeout> | undefined;

  /** The mode the bar shows as picked, ahead of the device confirming it.
   * `actionTimeout` puts it back if no confirmation comes. */
  private _selected: string | undefined;

  constructor() {
    super();
    this.mode = {} as HvacModeObject;
    this.timer = undefined;
    this._selected = undefined;
  }

  static override get properties() {
    return {
      mode: { type: Object },
    };
  }

  get items(): SourceItem[] {
    if (!this.mode.source) return [];
    return this.mode.source.filter(s => !s.hide);
  }

  static iconFor(item: SourceItem): string {
    if (item.icon) return item.icon;
    const id = (item.id ?? '').toString().toUpperCase();
    return id in ICON ? ICON[id] : ICON.DEFAULT;
  }

  handleClick(e: Event, item: SourceItem): void {
    e.stopPropagation();
    if (this.mode.disabled || item.id === this._selected) return;

    clearTimeout(this.timer);
    const { entity } = this.mode;
    const previous = this._selected;
    this._selected = item.id;

    this.timer = setTimeout(() => {
      if (this.mode.entity === entity) {
        this._selected = previous;
        this.requestUpdate('_selected');
      }
    }, this.mode.actionTimeout);

    this.mode.handleChange(item.id);
    this.requestUpdate('_selected');
  }

  override willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has('mode')) {
      clearTimeout(this.timer);
      const { state } = this.mode;
      this._selected = state === undefined || state === null ? undefined : state.toString();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.timer);
  }

  override render(): TemplateResult {
    return html`
      <div class='bar' role='radiogroup' ?disabled=${this.mode.disabled}>
        ${this.items.map(item => {
          const selected = item.id === this._selected;
          return html`
            <button
              class=${classMap({ seg: true, '--selected': selected, [`--${item.id}`]: true })}
              role='radio'
              aria-checked=${selected ? 'true' : 'false'}
              aria-label=${item.name ?? item.id}
              title=${item.name ?? item.id}
              @click=${(e: Event) => this.handleClick(e, item)}>
              <ha-icon .icon=${ClimateModeBar.iconFor(item)}></ha-icon>
            </button>`;
        })}
      </div>
    `;
  }

  static override get styles() {
    return [
      sharedStyle,
      css`
      :host {
        display: block;
        min-width: 0;
        --ha-icon-display: flex;
      }
      .bar {
        display: flex;
        gap: calc(var(--mc-unit) * .05);
        padding: calc(var(--mc-unit) * .05);
        border-radius: calc(var(--mc-unit) * .25);
        background: var(--mini-climate-mode-bar-background, rgba(127, 127, 127, .12));
        width: max-content;
        max-width: 100%;
        box-sizing: border-box;
      }
      .bar[disabled] {
        opacity: .25;
        pointer-events: none;
      }
      .seg {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1 1 0;
        min-width: 0;
        width: calc(var(--mc-unit) * .8);
        height: calc(var(--mc-unit) * .65);
        padding: 0;
        margin: 0;
        border: none;
        border-radius: calc(var(--mc-unit) * .2);
        background: none;
        color: var(--mc-text-color);
        cursor: pointer;
        transition: background-color .2s, color .2s;
        -webkit-appearance: none;
        appearance: none;
      }
      .seg ha-icon {
        width: calc(var(--mc-unit) * .45);
        height: calc(var(--mc-unit) * .45);
        --mdc-icon-size: calc(var(--mc-unit) * .45);
      }
      .seg.--selected {
        background: var(--mini-climate-mode-bar-selected-color, var(--mc-button-color));
        color: var(--mini-climate-mode-bar-selected-text-color, #fff);
      }
      `,
    ];
  }
}

define('mc-mode-bar', ClimateModeBar);
