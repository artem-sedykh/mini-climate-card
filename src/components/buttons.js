import { LitElement, html, css } from 'lit';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import sharedStyle from '../sharedStyle';
import ClimateButton from './button';
import ClimateDropDown from './dropdown';
import buildElementDefinitions from '../utils/buildElementDefinitions';

export default class ClimateButtons extends ScopedRegistryHost(LitElement) {
  static get defineId() { return 'mc-buttons'; }

  static get elementDefinitions() {
    return buildElementDefinitions([ClimateDropDown, ClimateButton]);
  }

  static get properties() {
    return {
      buttons: {},
    };
  }

  renderButton(button) {
    if (button.isUnavailable)
      return '';

    return html`
       <mc-button
         class="custom-button"
         .button=${button}>
        </mc-button>
    `;
  }

  renderDropdown(dropdown) {
    return html`
      <mc-dropdown
        .dropdown=${dropdown}>
      </mc-dropdown>
    `;
  }

  renderInternal(button) {
    if (button.type === 'dropdown')
      return this.renderDropdown(button);

    return this.renderButton(button);
  }

  render() {
    const context = this;
    return html`${Object.entries(this.buttons)
      .map(b => b[1])
      .filter(b => b.location !== 'main' && !b.hide)
      .sort((a, b) => ((a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0)))
      .map(button => context.renderInternal(button))}`;
  }

  static get styles() {
    return [
      sharedStyle,
      css`
      :host {
        position: relative;
        box-sizing: border-box;
        margin: 0;
        overflow: hidden;
        transition: background .5s;
        --paper-item-min-height: var(--mc-unit);
        --mc-dropdown-unit: var(--mc-unit);
        --mdc-icon-button-size: calc(var(--mc-unit));
      }
      :host([color]) {
        background: var(--mc-active-color);
        transition: background .25s;
        opacity: 1;
      }
      :host([disabled]) {
        opacity: .25;
        pointer-events: none;
      }
      mc-button {
        width: calc(var(--mc-unit));
        height: calc(var(--mc-unit));
      }
    `];
  }
}
