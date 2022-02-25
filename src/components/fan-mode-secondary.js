import { LitElement, html, css } from 'lit';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { ListBase } from '@material/mwc-list/mwc-list-base';
import { styles as listStyles } from '@material/mwc-list/mwc-list.css';
import { ListItemBase } from '@material/mwc-list/mwc-list-item-base';
import { styles as listItemStyles } from '@material/mwc-list/mwc-list-item.css';
import { ButtonBase } from '@material/mwc-button/mwc-button-base';
import { styles as buttonStyles } from '@material/mwc-button/styles.css';
import { MenuBase } from '@material/mwc-menu/mwc-menu-base';
import { styles as menuStyles } from '@material/mwc-menu/mwc-menu.css';
import { RippleBase } from '@material/mwc-ripple/mwc-ripple-base';
import { styles as rippleStyles } from '@material/mwc-ripple/mwc-ripple.css';
import { MenuSurfaceBase } from '@material/mwc-menu/mwc-menu-surface-base';
import { styles as menuSurfaceStyles } from '@material/mwc-menu/mwc-menu-surface.css';
import sharedStyle from '../sharedStyle';

export default class FanModeSecondary extends ScopedRegistryHost(LitElement) {
  static get elementDefinitions() {
    return {
      'ha-icon': customElements.get('ha-icon'),
      'mwc-list': class extends ListBase {
        static get styles() {
          return listStyles;
        }
      },
      'mwc-list-item': class extends ListItemBase {
        static get styles() {
          return listItemStyles;
        }
      },
      'mwc-button': class extends ButtonBase {
        static get styles() {
          return buttonStyles;
        }
      },
      'mwc-menu': class extends MenuBase {
        static get styles() {
          return menuStyles;
        }
      },
      'mwc-ripple': class extends RippleBase {
        static get styles() {
          return rippleStyles;
        }
      },
      'mwc-menu-surface': class extends MenuSurfaceBase {
        static get styles() {
          return menuSurfaceStyles;
        }
      },
    };
  }

  constructor() {
    super();
    this.fanMode = {};
    this.config = {};
    this.timer = undefined;
    this._selected = {};
    this.source = {};
  }

  static get properties() {
    return {
      fanMode: { type: Object },
      config: { type: Object },
    };
  }

  get selectedIndex() {
    return this.fanMode.source.map(item => item.id).indexOf(this._selected.id);
  }

  handleChange(e) {
    const index = e.target.selected;

    if (index === this.selectedIndex || !this.fanMode.source[index])
      return;

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

  renderFanMode() {
    const label = this._selected ? this._selected.name : this.fanMode.state;
    const icon = this.config.secondary_info.icon ? this.config.secondary_info.icon
      : this.fanMode.icon;

    return html`
       <ha-icon class='icon' .icon=${icon}></ha-icon>
       <span class='name'>${label}</span>
    `;
  }

  renderFanModeDropdown() {
    return html`
      <div class='mc-dropdown'>
        <ha-icon-button class='mc-dropdown__button icon'
          @click=${this.onclick}
          ?disabled=${this.fanMode.disabled}
        >
          ${this.renderFanMode()}
        </ha-icon-button>
        <mwc-menu
            id=${'menu'}
            .menuCorner=${'END'}
            .corner=${'TOP_START'}
            .quick=${true}
            .y=${44}
            .selected=${this.selectedIndex}
            @selected=${this.handleChange}>
          ${this.fanMode.source.map(item => html`
            <mwc-list-item value=${item.id || item.name}>
              <span class='mc-dropdown__item__label'>${item.name}</span>
            </mwc-list-item>`)}
        </mwc-menu>
      </div>
    `;
  }

  render() {
    const { type } = this.config.secondary_info;

    if (type === 'fan-mode-dropdown') {
      return this.renderFanModeDropdown();
    }

    return this.renderFanMode();
  }

  updated(changedProps) {
    if (changedProps.has('fanMode')) {
      clearTimeout(this.timer);
      this._selected = this.fanMode.selected;
      this.requestUpdate('_selected');
    }
  }

  static get styles() {
    return [
      sharedStyle,
      css`
      paper-menu-button {
        padding: 0;
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
        height: calc(var(--mc-unit) * .475);
        width: calc(var(--mc-unit) * .5);
        min-width: calc(var(--mc-unit) * .5);
        --mdc-icon-size: calc(var(--mc-unit) * 0.5);
      }
    `];
  }
}
