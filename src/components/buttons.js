import { LitElement, html, css } from 'lit-element';
import { styleMap } from 'lit-html/directives/style-map';
import sharedStyle from '../sharedStyle';
import './dropdown';

class ClimateButtons extends LitElement {
  static get properties() {
    return {
      state: {},
      buttons: {},
      climate: {},
    };
  }

  isOff(state) {
    return state && state.toString().trim().toUpperCase() === 'OFF';
  }

  isUnavailable(state) {
    return !state || state.toString().trim().toUpperCase() === 'UNAVAILABLE';
  }

  isOn(state) {
    return (this.isOff(state) === false && this.isUnavailable(state) === false) || false;
  }

  handleButtonClick(id, e) {
    e.stopPropagation();

    const button = this.buttons.find(b => b.id === id);
    const state = this.state[id];

    if (!state || !button)
      return;

    if (button.functions.toggle_action) {
      return button.functions.toggle_action(state.value, state.entity,
        this.climate.entity, this.climate.mode);
    }

    const entityId = state.entity.entity_id;

    return this.climate.callService('switch', 'toggle',
      { entity_id: entityId });
  }

  renderButton(button) {
    const { id } = button;
    const state = this.state[id];
    let style;

    if (!state)
      return '';

    let value = state.originalValue;

    if (button.functions.state && button.functions.state.mapper) {
      value = button.functions.state.mapper(value, state.entity,
        this.climate.entity, this.climate.mode);
    }

    state.value = value;

    if (this.isUnavailable(value))
      return '';

    const isOn = this.isOn(value);
    let disabled = false;

    if (button.functions.disabled) {
      disabled = button.functions.disabled(value, state.entity,
        this.climate.entity, this.climate.mode);
    }

    if (button.functions.style)
      style = button.functions.style(value, state.entity,
        this.climate.entity, this.climate.mode);

    return html`
       <ha-icon-button
         style=${styleMap(style || {})}
         class='custom-button'
         .icon=${button.icon}
         @click=${e => this.handleButtonClick(id, e)}
         ?disabled="${disabled}"
         ?color=${isOn}>
        </ha-icon-button>
    `;
  }

  handleChange(id, e) {
    e.stopPropagation();
    const state = this.state[id];
    const dropdown = this.buttons.find(b => b.id === id);

    if (!state || !dropdown)
      return;

    const selected = e.detail.id;

    if (dropdown.functions.change_action) {
      return dropdown.functions.change_action(selected, state.value, state.entity,
        this.climate.entity, this.climate.mode);
    }
  }

  getDropdownSource(dropdown) {
    if (!dropdown.source || !dropdown.source)
      return [];

    const source = [];
    const data = Object.entries(dropdown.source || {});

    for (let i = 0; i < data.length; i += 1) {
      const key = data[i][0];
      const value = data[i][1];

      if (key !== '__filter') {
        const item = { id: key, name: value };
        source.push(item);
      }
    }

    return source;
  }

  renderDropdown(dropdown) {
    const { id } = dropdown;
    const state = this.state[id];
    let style;

    if (!state)
      return '';

    let value = state.originalValue;

    if (dropdown.functions.state && dropdown.functions.state.mapper) {
      value = dropdown.functions.state.mapper(value, state.entity,
        this.climate.entity, this.climate.mode);
    }

    let source = this.getDropdownSource(dropdown);
    let active = false;
    state.value = value;
    let disabled = false;

    if (dropdown.functions.disabled) {
      disabled = dropdown.functions.disabled(value, state.entity,
        this.climate.entity, this.climate.mode);
    }

    if (dropdown.functions.source && dropdown.functions.source.filter) {
      source = dropdown.functions.source.filter(source, value, state.entity,
        this.climate.entity, this.climate.mode);
    }

    if (dropdown.functions.active) {
      active = dropdown.functions.active(value, state.entity,
        this.climate.entity, this.climate.mode);
    }

    if (dropdown.functions.style)
      style = dropdown.functions.style(value, state.entity,
        this.climate.entity, this.climate.mode);

    return html`
      <mc-dropdown
        style=${styleMap(style || {})}
        @change=${e => this.handleChange(id, e)}
        .items=${source}
        .icon=${dropdown.icon}
        ?disabled="${disabled}"
        .active=${active}
        .selected=${state.value}>
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
    return html`${this.buttons.filter(b => !b.hide)
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
    `];
  }
}

customElements.define('mc-buttons', ClimateButtons);
