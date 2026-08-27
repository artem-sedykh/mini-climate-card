import define from '../utils/define';
import { LitElement, html, css, type PropertyValues, type TemplateResult } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import sharedStyle from '../sharedStyle';
import type ButtonObject from '../models/button';
import type { CardConfig, SourceItem } from '../types';
import type ClimateMenu from './menu';
import './menu';

export default class ClimateFanModeSecondary extends LitElement {
  fanMode!: ButtonObject;

  config!: CardConfig;

  private timer: ReturnType<typeof setTimeout> | undefined;

  /** The option the button is showing, which a pick changes before the device
   * confirms it. `actionTimeout` puts it back if nothing comes. */
  private _selected: SourceItem | undefined;

  constructor() {
    super();
    this.fanMode = {} as ButtonObject;
    this.config = {} as CardConfig;
    this.timer = undefined;
    this._selected = {} as SourceItem;
  }

  static override get properties() {
    return {
      fanMode: { type: Object },
      config: { type: Object },
    };
  }

  get selectedIndex(): number {
    // `_selected` is undefined whenever the device reports a mode the source
    // list does not contain - a user-narrowed `source`, or an option the
    // integration added later. Reading `.id` off it threw, and the throw came
    // out of a click handler, so the pick did nothing at all. See #231.
    return this.fanMode.source.map(item => item.id).indexOf(this._selected?.id as string);
  }

  handleChange(e: CustomEvent): void {
    const { index } = e.detail;

    if (index === this.selectedIndex || !this.fanMode.source[index]) return;

    clearTimeout(this.timer);

    const selected = this.fanMode.source[index];
    const { entity } = this.fanMode;
    const oldSelected = this._selected;
    this._selected = selected;

    this.timer = setTimeout(async () => {
      if (this.fanMode.entity === entity) {
        this._selected = oldSelected;
        this.requestUpdate('_selected');
      }
    }, this.fanMode.actionTimeout);

    this.fanMode.handleChange(selected.id);

    this.requestUpdate('_selected');
  }

  renderFanMode(gap = 0): TemplateResult {
    const label = this._selected ? this._selected.name : this.fanMode.state;
    const icon = this.config.secondary_info.icon
      ? this.config.secondary_info.icon
      : this.fanMode.icon;
    const gapStyle = gap ? { 'padding-left': `${gap}px` } : {};

    return html`
       <ha-icon class='icon' .icon=${icon}></ha-icon>
       <span class='name' style=${styleMap(gapStyle)}>${label}</span>
    `;
  }

  handleClick(): void {
    const menu = this.shadowRoot!.querySelector('#menu') as ClimateMenu;
    const anchor = this.shadowRoot!.querySelector('#button') as HTMLElement;
    menu.anchor = anchor;
    menu.show();
  }

  handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleClick();
    }
  }

  renderFanModeDropdown(): TemplateResult {
    return html`
      <div class='mc-dropdown'>
        <!-- The whole drop (icon + label) is the button, not just the 20x20
             icon grid. Anchored and keyboard-focusable like one, so the menu
             opens wherever the reader presses, not only on the glyph. -->
        <button
          class='mc-dropdown__button'
          id=${'button'}
          @click=${this.handleClick}
          @keydown=${this.handleKeydown}
          ?disabled=${this.fanMode.disabled}
          role='button'
          tabindex='0'
        >
          ${this.renderFanMode(3)}
        </button>
        <mc-menu
          id=${'menu'}
          .items=${this.fanMode.source}
          .selected=${this._selected?.id}
          @selected=${this.handleChange}
        ></mc-menu>
      </div>
    `;
  }

  override render(): TemplateResult {
    const { type } = this.config.secondary_info;

    if (type === 'fan-mode-dropdown') {
      return this.renderFanModeDropdown();
    }

    return this.renderFanMode();
  }

  // See the note in button.js: derived before the render rather than after
  // it, so one state change costs one pass.
  override willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has('fanMode')) {
      clearTimeout(this.timer);
      this._selected = this.fanMode.selected;
    }
  }

  static override get styles() {
    return [
      sharedStyle,
      css`
      .mc-dropdown {
        padding: 0;
      }
      /* The whole drop is the click target - icon and label in one row - and
         the label is sized by the same unit as the secondary info line. The
         only shadow-owning element left is the menu, which renders in a top
         layer and does not interfere. */
      .mc-dropdown__button {
        display: flex;
        align-items: center;
        padding: 0;
        margin: 0;
        border: none;
        background: none;
        color: inherit;
        font-family: inherit;
        cursor: pointer;
        text-align: start;
        -webkit-appearance: none;
        appearance: none;
      }
      .mc-dropdown__button[disabled] {
        opacity: .25;
        pointer-events: none;
      }
      .name {
        font-size: calc(var(--mc-unit) * .35);
        font-weight: var(--mc-info-font-weight);
        line-height: calc(var(--mc-unit) * .5);
        vertical-align: middle;
        display: inline-block;
      }
      .icon {
        color: var(--mc-icon-color);
        /* Square, and the same size as the button and the glyph inside it.
           The height was .475 against a width of .5 - 19px against 20px - so
           whatever the button did, it could not sit inside the host. */
        height: calc(var(--mc-unit) * .5);
        width: calc(var(--mc-unit) * .5);
        min-width: calc(var(--mc-unit) * .5);
        --mdc-icon-size: calc(var(--mc-unit) * 0.5);
        /* The button inside ha-icon-button is sized by these, not by the host:
           without them it keeps whatever it inherits - 30px against a 20px
           host on 2026.8.3 - and spills out of the secondary info line. Both
           spellings, like everywhere else in this card: --mdc-icon-button-size
           is the pre-2026 knob and --ha-icon-button-size the current one. */
        --mdc-icon-button-size: calc(var(--mc-unit) * .5);
        --ha-icon-button-size: calc(var(--mc-unit) * .5);
      }
    `,
    ];
  }
}

define('mc-fan-mode-secondary', ClimateFanModeSecondary);
