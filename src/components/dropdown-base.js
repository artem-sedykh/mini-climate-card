import { LitElement, html, css } from 'lit-element';

import sharedStyle from '../sharedStyle';

class ClimateDropdownBase extends LitElement {
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
    const id = e.target.selected;
    if (id !== this.selectedId && this.items[id]) {
      this.dispatchEvent(new CustomEvent('change', {
        detail: this.items[id],
      }));
      e.target.selected = -1;
    }
  }

  onClick() {
    this.shadowRoot.querySelector('#menu').show();
  }

  render() {
    return html`
      <div class='mc-dropdown'>
        <ha-icon-button class='mc-dropdown__button icon'
          .icon=${this.icon}
          @click=${this.onclick}
          ?disabled=${this.disabled}
          ?color=${this.active}>
            <ha-icon .icon=${this.icon}></ha-icon>
        </ha-icon-button>
        <mwc-menu
            id=${'menu'}
            .menuCorner=${'END'}
            .corner=${'TOP_START'}
            .quick=${true}
            .y=${44}
            .selected=${this.selectedId}
            @selected=${this.onChange}>
          ${this.items.map(item => html`
            <mwc-list-item value=${item.id || item.name}>
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

customElements.define('mc-dropdown-base', ClimateDropdownBase);
