import define from '../utils/define';
import { LitElement, html, css, type PropertyDeclarations, type TemplateResult } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';

import sharedStyle from '../sharedStyle';
import type { SourceItem } from '../types';
import type ClimateMenu from './menu';
import './menu';

export default class ClimateDropdownBase extends LitElement {
  items!: SourceItem[];

  label!: string;

  selected!: string;

  icon!: string;

  active!: boolean;

  disabled!: boolean;

  iconStyle: Record<string, string>;

  // Each of these used to name a bare constructor, or - for `items` - an
  // empty array, which lit reads no `type` off at all. See #230.
  static override get properties(): PropertyDeclarations {
    return {
      items: { type: Array },
      label: { type: String },
      selected: { type: String },
      icon: { type: String },
      active: { type: Boolean },
      disabled: { type: Boolean },
      iconStyle: { type: Object },
    };
  }

  constructor() {
    super();
    this.iconStyle = {};
  }

  get selectedId(): number {
    return this.items.map(item => item.id).indexOf(this.selected);
  }

  onChange(e: CustomEvent): void {
    const { index } = e.detail;
    if (index !== this.selectedId && this.items[index]) {
      this.dispatchEvent(
        new CustomEvent('change', {
          detail: this.items[index],
        }),
      );
    }
  }

  handleClick(): void {
    // Both live in this component's own shadow root, rendered unconditionally
    // above - the assertions say that rather than guess it.
    const menu = this.shadowRoot!.querySelector('#menu') as ClimateMenu;
    menu.anchor = this.shadowRoot!.querySelector('#button') as HTMLElement;
    menu.show();
  }

  override render(): TemplateResult {
    return html`
      <div class='mc-dropdown'>
        <ha-icon-button class='mc-dropdown__button icon'
          style=${styleMap(this.iconStyle)}
          id=${'button'}
          @click=${this.handleClick}
          ?disabled=${this.disabled}
          ?color=${this.active}>
            <ha-icon .icon=${this.icon}></ha-icon>
        </ha-icon-button>
        <mc-menu
          id=${'menu'}
          .items=${this.items}
          .selected=${this.selected}
          @selected=${this.onChange}
        ></mc-menu>
      </div>
    `;
  }

  static override get styles() {
    return [
      sharedStyle,
      css`
        :host {
          position: relative;
          overflow: hidden;
        }
        .mc-dropdown
        :host([disabled]) {
          opacity: .25;
          pointer-events: none;
        }
        :host([faded]) {
          opacity: .75;
        }
        .mc-dropdown {
          padding: 0;
        }
        ha-icon-button[disabled] {
          opacity: .25;
          pointer-events: none;
        }
        .mc-dropdown__button.icon {
          margin: 0;
        }
        ha-icon-button {
          width: calc(var(--mc-dropdown-unit));
          height: calc(var(--mc-dropdown-unit));
          --mdc-icon-button-size: calc(var(--mc-dropdown-unit));
          --ha-icon-button-size: calc(var(--mc-dropdown-unit));
        }
        .mc-dropdown[focused] ha-icon-button {
          color: var(--mc-accent-color);
        }
        .mc-dropdown[focused] ha-icon-button[focused] {
          color: var(--mc-text-color);
          transform: rotate(0deg);
        }
      `,
    ];
  }
}

define('mc-dropdown-base', ClimateDropdownBase);
