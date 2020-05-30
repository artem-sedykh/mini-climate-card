import { LitElement, html, css } from 'lit-element';

import sharedStyle from '../sharedStyle';

class MiniClimateDropdown extends LitElement {
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

  render() {
    return html`
      <paper-menu-button
        class='mc-dropdown'
        noink no-animations
        .horizontalAlign=${'right'}
        .verticalAlign=${'top'}
        .verticalOffset=${44}
        .dynamicAlign=${true}
        ?disabled=${this.disabled}
        @click=${e => e.stopPropagation()}>
        <ha-icon-button class='mc-dropdown__button icon' slot='dropdown-trigger'
          .icon=${this.icon}
          ?disabled=${this.disabled}
          ?color=${this.active}>
        </ha-icon-button>
        <paper-listbox slot="dropdown-content" .selected=${this.selectedId} @iron-select=${this.onChange}>
          ${this.items.map(item => html`
            <paper-item value=${item.id || item.name}>
              <span class='mc-dropdown__item__label'>${item.name}</span>
            </paper-item>`)}
        </paper-listbox>
      </paper-menu-button>
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

customElements.define('mc-dropdown', MiniClimateDropdown);
