import { html, LitElement } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { styleMap } from 'lit-html/directives/style-map';
import ClimateObject from './model';
import style from './style';
import sharedStyle from './sharedStyle';
import handleClick from './utils/handleClick';
import getLabel from './utils/getLabel';
import { version } from '../package';
import './components/indicators';
import './components/modeMenu';
import './components/buttons';
import './components/temperature';
import './components/temperatureControls';
import {
  compileTemplate,
  getEntityValue,
  round,
  toggleState,
} from './utils/utils';
import ICON from './const';

if (!customElements.get('ha-icon-button')) {
  customElements.define(
    'ha-icon-button',
    class extends customElements.get('paper-icon-button') {},
  );
}

class MiniClimate extends LitElement {
  constructor() {
    super();
    this.initial = true;
    this.toggle = false;
    this.targetTemperature = { inFlux: false };
    this.temperature = undefined;
    this.buttonsState = {};
    this.indicatorsState = {};

    // eslint-disable-next-line no-console
    console.info(
      `%c MINI-CLIMATE-CARD %c ${version} `,
      'color: white; background: coral; font-weight: 700;',
      'color: coral; background: white; font-weight: 700;',
    );
  }

  static get properties() {
    return {
      _hass: {},
      config: {},
      entity: {},
      climate: {},
      initial: Boolean,
      toggle: Boolean,
    };
  }

  static get styles() {
    return [
      sharedStyle,
      style,
    ];
  }

  set hass(hass) {
    if (!hass) return;
    const entity = hass.states[this.config.entity];
    this._hass = hass;

    if (entity && this.entity !== entity) {
      this.entity = entity;
      this.climate = new ClimateObject(hass, this.config, entity);

      if (this.targetTemperature.value !== this.climate.targetTemperature.value) {
        this.targetTemperature = { ...this.targetTemperature, ...this.climate.targetTemperature };
      }
    }

    this.updateIndicatorsState(hass);
    this.updateButtonsState(hass);
    this.updateTemperature(hass);
  }

  get hass() {
    return this._hass;
  }

  get name() {
    return this.config.name || this.climate.name;
  }

  updateIndicatorsState(hass) {
    const indicatorsState = { };
    let changed = false;

    for (let i = 0; i < this.config.indicators.length; i += 1) {
      const indicator = this.config.indicators[i];
      const { id } = indicator;
      this.indicatorsState[id] = this.indicatorsState[id] || {};

      if (indicator.source) {
        const entityId = indicator.source.entity || this.config.entity;
        const entity = hass.states[entityId];

        if (entity) {
          indicatorsState[id] = indicatorsState[id] || {};
          indicatorsState[id].originalValue = getEntityValue(entity, indicator.source);
          indicatorsState[id].entity = entity;
        }

        if (entity !== this.indicatorsState[indicator.id].entity)
          changed = true;
      }
    }

    if (changed)
      this.indicatorsState = indicatorsState;
  }

  updateTemperature(hass) {
    const entityId = this.config.temperature.source.entity || this.config.entity;
    const entity = hass.states[entityId];
    let temperature;

    if (entity) {
      temperature = getEntityValue(entity, this.config.temperature.source);
      if (temperature !== undefined)
        temperature = round(temperature, this.config.temperature.round);

      if (temperature && this.temperature !== temperature) {
        this.temperature = temperature;
      }
    }
  }

  updateButtonsState(hass) {
    const buttonsState = { };
    let changed = false;

    for (let i = 0; i < this.config.buttons.length; i += 1) {
      const button = this.config.buttons[i];
      this.buttonsState[button.id] = this.buttonsState[button.id] || {};

      const entityId = button.state.entity || this.config.entity;
      const entity = hass.states[entityId];

      if (entity) {
        buttonsState[button.id] = buttonsState[button.id] || {};
        buttonsState[button.id].entity = entity;
        buttonsState[button.id].originalValue = getEntityValue(entity, button.state);

        if (button.id === 'fan_mode') {
          const source = this.getFanModeSource(button, entity);
          if (button.source !== source) {
            button.source = source;
            changed = true;
          }
        }
      }

      if (entity !== this.buttonsState[button.id].entity)
        changed = true;
    }

    if (changed)
      this.buttonsState = buttonsState;
  }

  getFanModeSource(button, entity) {
    const entries = Object.entries(button.source || {}).filter(s => s[0] !== '__filter');
    let source = {};

    if (entries.length === 0 && entity && entity.attributes && entity.attributes.fan_modes) {
      for (let i = 0; i < entity.attributes.fan_modes.length; i += 1) {
        const fanMode = entity.attributes.fan_modes[i];
        const labels = [`state_attributes.climate.fan_mode.${fanMode}`];
        source[fanMode] = getLabel(this.hass, labels, fanMode);
      }

      source = { ...source, ...button.source || {} };

      return source;
    }

    return button.source;
  }

  getButtonsConfig(config) {
    const data = Object.entries(config.buttons || {});

    const buttons = [];

    for (let i = 0; i < data.length; i += 1) {
      const key = data[i][0];
      const value = data[i][1];
      const button = this.getButtonConfig(key, value, config);

      if (!('order' in button))
        button.order = i + 1;

      buttons.push(button);
    }

    return buttons;
  }

  getButtonConfig(key, value, config) {
    const item = {
      id: key,
      icon: 'mdi:radiobox-marked',
      type: 'button',
      toggle_action: undefined,
      ...value,
    };

    item.functions = {};

    const context = { ...value };
    context.callService = (domain, service, options) => this.hass.callService(
      domain, service, options,
    );
    context.entity_config = config;
    context.toggle_state = toggleState;

    if (item.disabled) {
      item.functions.disabled = compileTemplate(item.disabled, context);
    }

    if (item.state && item.state.mapper) {
      item.functions.state = { mapper: compileTemplate(item.state.mapper, context) };
    }

    if (item.active) {
      item.functions.active = compileTemplate(item.active, context);
    }

    if (item.source && item.source.__filter) {
      item.functions.source = { filter: compileTemplate(item.source.__filter, context) };
    }

    if (item.toggle_action) {
      item.functions.toggle_action = compileTemplate(item.toggle_action, context);
    }

    if (item.change_action) {
      item.functions.change_action = compileTemplate(item.change_action, context);
    }

    if (item.style)
      item.functions.style = compileTemplate(item.style, context);

    return item;
  }

  getFanModeConfig(config) {
    let fanModeConfig = {
      icon: 'mdi:fan',
      type: 'dropdown',
      order: 0,
      state: { attribute: 'fan_mode' },
      active: '(state, entity) => entity.state !== \'off\'',
      change_action: '(selected, state, entity) => this.callService(\'climate\', \'set_fan_mode\', { entity_id: entity.entity_id, fan_mode: selected })',
      ...config.fan_mode || {},
    };

    fanModeConfig = this.getButtonConfig('fan_mode', fanModeConfig, config);
    return fanModeConfig;
  }

  getIndicatorsConfig(config) {
    const data = Object.entries(config.indicators || {});

    const indicators = [];

    for (let i = 0; i < data.length; i += 1) {
      const key = data[i][0];
      const value = data[i][1];

      const item = {
        id: key,
        source: { enitity: undefined, attribute: undefined, mapper: undefined },
        icon: '',
        ...value,
      };

      item.functions = {};
      const context = { ...value };
      context.entity_config = config;
      context.toggle_state = toggleState;

      if (item.source.mapper)
        item.functions.mapper = compileTemplate(item.source.mapper, context);

      if (typeof item.icon === 'object') {
        item.functions.icon = {};

        if (item.icon.template)
          item.functions.icon.template = compileTemplate(item.icon.template, context);

        if (item.icon.style)
          item.functions.icon.style = compileTemplate(item.icon.style, context);
      }

      indicators.push(item);
    }

    return indicators;
  }

  setConfig(config) {
    if (!config.entity || config.entity.split('.')[0] !== 'climate')
      throw new Error('Specify an entity from within the fan domain.');

    this.config = {
      toggle_power: true,
      fan_modes: [],
      modes: { source: {} },
      tap_action: {
        action: 'more-info',
        navigation_path: '',
        url: '',
        entity: '',
        service: '',
        service_data: {},
      },
      ...config,
    };

    this.config.indicators = this.getIndicatorsConfig(config);

    this.config.buttons = this.getButtonsConfig(config);

    this.config.buttons.push(this.getFanModeConfig(config));

    this.config.target_temperature = {
      hide: false,
      unit: '°C',
      ...config.target_temperature || {},
    };

    this.config.target_temperature.icons = {
      up: ICON.UP,
      down: ICON.DOWN,
      ...this.config.target_temperature.icons || {},
    };

    this.config.temperature = {
      round: 1,
      unit: '°C',
      source: { entity: undefined, attribute: 'current_temperature' },
      ...config.current_temperature || {},
    };

    this.config.fan_mode = {
      icon: ICON.FAN,
      hide: false,
      order: 0,
      ...config.fan_mode || {},
    };

    this.hvac_mode = {
      ...config.hvac_mode || {},
    };
  }

  renderCtlWrap() {
    if (this.climate.isUnavailable) {
      return html`
        <span class="label ellipsis">        
          ${getLabel(this.hass, ['state.default.unavailable'], 'Unavailable')}
        </span>
      `;
    }

    return html`
        <mc-mode-menu
          .hass=${this.hass}
          .climate=${this.climate}
          .config=${this.config}>
        </mc-mode-menu>
        <mc-temperature
          .targetTemperature=${this.targetTemperature}
          .temperature=${this.temperature}>
        </mc-temperature>
    `;
  }

  renderEntityControls() {
    if (this.climate.isUnavailable)
      return '';

    return html`
        <div class="entity__controls">
          <mc-temperature-controls
            .climate=${this.climate}
            .config=${this.config.target_temperature}
            .targetTemperature=${this.targetTemperature}
            @changed="${e => this.handleChangeTargetTemperature(e)}">
          </mc-temperature-controls>
        </div>
    `;
  }

  render() {
    return html`
      <ha-card
        class=${this.computeClasses()}
        style=${this.computeStyles()}
        @click=${e => this.handlePopup(e)}>
        <div class='mc__bg'></div>
        <div class='mc-climate'>
          <div class='mc-climate__core flex'>
            ${this.renderIcon()}
            <div class='entity__info'>
              <div class="wrap">
                <div class="entity__info__name_wrap">
                  ${this.renderEntityName()}
                </div>
                <div class="ctl-wrap ellipsis">
                  ${this.renderCtlWrap()}
                </div>
              </div>
              ${this.renderBottomPanel()}
            </div>
            ${this.renderEntityControls()}
          </div>
          ${this.renderTogglePanel()}
        </div>
      </ha-card>
    `;
  }

  handleChangeTargetTemperature(e) {
    const old = this.targetTemperature;
    this.targetTemperature = { ...e.detail.targetTemperature };

    return this.requestUpdate('targetTemperature', old);
  }

  handlePopup(e) {
    e.stopPropagation();
    handleClick(this, this._hass, this.config, this.config.tap_action, this.climate.id);
  }

  handleToggle(e) {
    e.stopPropagation();
    this.toggle = !this.toggle;
  }

  toggleButtonCls() {
    return this.toggle ? 'open' : '';
  }

  renderIcon() {
    const state = this.climate.isActive;
    return html`
      <div class='entity__icon' ?color=${state}>
        <ha-icon .icon=${this.computeIcon()} ></ha-icon>
      </div>`;
  }

  renderTogglePanel() {
    if (!this.toggle)
      return '';

    return html`
        <div class="mc-toggle_content">
          <mc-buttons
            .climate=${this.climate}
            .buttons=${this.config.buttons}
            .state=${this.buttonsState}>
          </mc-buttons>
        </div>
    `;
  }

  renderToggleButton() {
    if (this.config.buttons.filter(b => !b.hide).length === 0)
      return '';

    return html`
        <ha-icon-button class='toggle-button ${this.toggleButtonCls()}'
          icon='mdi:dots-horizontal'
          @click=${e => this.handleToggle(e)}>
        </ha-icon-button>
    `;
  }

  renderBottomPanel() {
    if (this.climate.isUnavailable)
      return '';

    return html`
        <div class='bottom flex'>
          <mc-indicators
            .climate=${this.climate}
            .state=${this.indicatorsState}
            .indicators=${this.config.indicators}>
          </mc-indicators>
          ${this.renderToggleButton()}
        </div>
    `;
  }

  renderEntityName() {
    return html`
      <div class='entity__info__name'>
        ${this.name}
      </div>
     ${this.renderSecondaryInfo()}
    `;
  }

  renderSecondaryInfo() {
    if (this.climate.isUnavailable)
      return '';

    const fanModeConfig = this.config.buttons.find(b => b.id === 'fan_mode');
    const label = this.getSecondaryInfoLabel(fanModeConfig);
    return html`
      <div class='entity__secondary_info ellipsis'>
         <ha-icon class='entity__secondary_info_icon' .icon=${fanModeConfig.icon}></ha-icon>
         <span class='entity__secondary_info__name'>${label}</span>
      </div>
    `;
  }

  getSecondaryInfoLabel(fanModeConfig) {
    const state = this.buttonsState.fan_mode;

    let value = state.originalValue;

    if (fanModeConfig.functions.state && fanModeConfig.functions.state.mapper) {
      value = fanModeConfig.functions.state.mapper(value, state.entity,
        this.climate.entity, this.climate.mode);
    }

    if (value in fanModeConfig.source)
      value = fanModeConfig.source[value];

    return value;
  }

  computeIcon() {
    return this.config.icon ? this.config.icon : this.climate.icon || ICON.DEFAULT;
  }

  computeClasses({ config } = this) {
    return classMap({
      '--initial': this.initial,
      '--collapse': config.collapse,
      '--group': config.group,
      '--more-info': config.tap_action !== 'none',
      '--inactive': !this.climate.isActive,
      '--unavailable': this.climate.isUnavailable,
    });
  }

  computeStyles() {
    const { scale } = this.config;
    return styleMap({
      ...(scale && { '--mc-unit': `${40 * scale}px` }),
    });
  }
}

customElements.define('mini-climate', MiniClimate);
