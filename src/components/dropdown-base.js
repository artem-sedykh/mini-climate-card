import { LitElement, html, css } from 'lit';

import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import sharedStyle from '../sharedStyle';
import ClimateMenu from './mwc/menu';
import ClimateListItem from './mwc/list-item';
import ClimateIcon from './ha/icon';
import ClimateIconButton from './ha/icon-button';

export default class ClimateDropdownBase extends ScopedRegistryHost(LitElement) {
  static get defineId() { return 'mc-dropdown-base'; }

  static get elementDefinitions() {
    return {
      [ClimateIcon.defineId]: ClimateIcon,
      [ClimateIconButton.defineId]: ClimateIconButton,
      [ClimateMenu.defineId]: ClimateMenu,
      [ClimateListItem.defineId]: ClimateListItem,
    };
  }

  static get properties() {
    return {
      items: [],
      label: String,
      selected: String,
      icon: String,
      active: Boolean,
      disabled: Boolean,
    };
  }

  get selectedId() {
    return this.items.map(item => item.id).indexOf(this.selected);
  }

  onChange(e) {
    const { index } = e.detail;
    if (index !== this.selectedId && this.items[index]) {
      this.dispatchEvent(new CustomEvent('change', {
        detail: this.items[index],
      }));
      e.detail.index = -1;
    }
  }

  handleClick() {
    this.shadowRoot.querySelector('#menu').show();
  }

  render() {
    return html`
      <div class='mc-dropdown'>
        <ha-icon-button class='mc-dropdown__button icon'
          @click=${this.handleClick}
          ?disabled=${this.disabled}
          ?color=${this.active}>
            <ha-icon .icon=${this.icon}></ha-icon>
        </ha-icon-button>
        <mwc-menu activatable absolute
            id=${'menu'}
            .menuCorner=${'END'}
            .corner=${'TOP_LEFT'}
            .quick=${true}
            .y=${44}
            @selected=${this.onChange}>
          ${this.items.map(item => html`
            <mwc-list-item value=${item.id || item.name} ?selected=${this.selected === item.id}>
              <span class='mc-dropdown__item__label'>${item.name}</span>
            </mwc-list-item>`)}
        </mwc-menu>
      </div>
    `;
  }

  static get styles() {
    return [
      sharedStyle,
      css`
        :host {
          position: relative;
          overflow: hidden;
          --paper-item-min-height: 40px;
        }
        paper-menu-button
        :host([disabled]) {
          opacity: .25;
          pointer-events: none;
        }
        :host([faded]) {
          opacity: .75;
        }
        .mc-dropdown {
          padding: 0;
          display: block;
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
        }
        paper-item > *:nth-child(2) {
          margin-left: 4px;
        }
        paper-menu-button[focused] ha-icon-button {
          color: var(--mc-accent-color);
        }
        paper-menu-button[focused] ha-icon-button[focused] {
          color: var(--mc-text-color);
          transform: rotate(0deg);
        }
      `,
    ];
  }
}
