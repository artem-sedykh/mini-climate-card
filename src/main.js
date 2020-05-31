import { html, LitElement } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { styleMap } from 'lit-html/directives/style-map';
import style from './style';
import sharedStyle from './sharedStyle';
import handleClick from './utils/handleClick';
import getLabel from './utils/getLabel';
import { version } from '../package';
import './components/indicators';
import './components/modeMenu';
import './components/buttons';
import './components/temperature';
import './components/targetTemperature';
import {
  compileTemplate,
  toggleState,
} from './utils/utils';
import ICON from './const';
import TemperatureObject from './models/temperature';
import TargetTemperatureObject from './models/targetTemperature';
import ButtonObject from './models/button';
import IndicatorObject from './models/indicator';
import ClimateObject from './models/climate';

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
    this.temperature = {};
    this.targetTemperature = {};
    this.buttons = {};
    this.indicators = {};
    this.targetTemperatureChanging = false;

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
    }

    this.updateIndicators(hass);
    this.updateButtons(hass);
    this.updateTemperature(hass);
    this.updateTargetTemperature(hass);
  }

  get hass() {
    return this._hass;
  }

  get name() {
    return this.config.name || this.climate.name;
  }

  updateIndicators(hass) {
    const indicators = { };
    let changed = false;

    for (let i = 0; i < this.config.indicators.length; i += 1) {
      const config = this.config.indicators[i];
      const { id } = config;

      const entityId = config.source.entity || this.climate.id;
      const entity = hass.states[entityId];

      if (entity) {
        indicators[id] = new IndicatorObject(entity, config, this.climate);
      }

      if (entity !== (this.indicators[id] && this.indicators[id].entity))
        changed = true;
    }

    if (changed)
      this.indicators = indicators;
  }

  updateTemperature(hass) {
    if (this.targetTemperatureChanging)
      return;

    const temperatureEntityId = this.config.temperature.source.entity || this.config.entity;
    const temperatureEntity = hass.states[temperatureEntityId];

    const targetTemperatureEntityId = (this.config.target_temperature.source
      && this.config.target_temperature.source.entity) || this.config.entity;

    const targetTemperatureEntity = hass.states[targetTemperatureEntityId];

    const temperature = new TemperatureObject(temperatureEntity, targetTemperatureEntity,
      this.config);

    if (this.temperature.rawValue !== temperature.rawValue
      || this.temperature.target !== temperature.target) {
      this.temperature = temperature;
    }
  }

  updateTargetTemperature(hass) {
    if (this.targetTemperatureChanging)
      return;

    const targetTemperatureEntityId = (this.config.target_temperature.source
      && this.config.target_temperature.source.entity) || this.config.entity;

    const targetTemperatureEntity = hass.states[targetTemperatureEntityId];
    const targetTemperature = new TargetTemperatureObject(hass, targetTemperatureEntity,
      this.config);

    if (this.targetTemperature.value !== targetTemperature.value) {
      this.targetTemperature = targetTemperature;
    }
  }

  updateButtons(hass) {
    const buttons = { };
    let changed = false;

    for (let i = 0; i < this.config.buttons.length; i += 1) {
      const config = this.config.buttons[i];
      const { id } = config;

      const entityId = (config.state && config.state.entity) || this.climate.id;
      const entity = hass.states[entityId];

      if (entity) {
        buttons[id] = new ButtonObject(entity, config, this.climate);
      }

      if (entity !== (this.buttons[id] && this.buttons[id].entity))
        changed = true;
    }

    if (changed)
      this.buttons = buttons;
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
      ...config.fan_mode || {},
    };

    fanModeConfig = this.getButtonConfig('fan_mode', fanModeConfig, config);

    const entries = Object.entries(fanModeConfig.source || {}).filter(s => s[0] !== '__filter');
    const labelPrefix = 'state_attributes.climate.fan_mode';

    if (entries.length === 0) {
      fanModeConfig.functions.source.__init = e => ((e.attributes && e.attributes.fan_modes) || [])
        .map(f => ({ id: f, name: getLabel(this.hass, [`${labelPrefix}.${f}`], f) }));
    }

    if (!fanModeConfig.functions.change_action)
      fanModeConfig.functions.change_action = selected => this.climate.setFanMode(selected);

    if (!fanModeConfig.functions.active)
      fanModeConfig.functions.active = () => this.climate.isOn;

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
      source: { entity: undefined, attribute: 'temperature' },
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
          .climate=${this.climate}>
        </mc-mode-menu>
        <mc-temperature
          .temperature=${this.temperature}
          .target=${this.temperature.target}
          .changing=${this.targetTemperatureChanging}>
        </mc-temperature>
    `;
  }

  renderEntityControls() {
    if (this.climate.isUnavailable)
      return '';

    return html`
        <div class="entity__controls">
          <mc-target-temperature
            .target_temperature=${this.targetTemperature}
            @changing="${e => this.handleChangingTargetTemperature(e)}">
          </mc-target-temperature>
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

  handleChangingTargetTemperature(e) {
    this.temperature.target = this.targetTemperature.value;
    this.targetTemperatureChanging = e.detail.changing;
    return this.requestUpdate('targetTemperatureChanging');
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
            .buttons=${this.buttons}>
          </mc-buttons>
        </div>
    `;
  }

  renderBottomPanel() {
    if (this.climate.isUnavailable)
      return '';

    return html`
        <div class='bottom flex'>
          <mc-indicators .indicators=${this.indicators}></mc-indicators>
          ${this.renderToggleButton()}
        </div>
    `;
  }

  renderToggleButton() {
    if (this.config.buttons.filter(b => !b.hide).length === 0)
      return '';

    return html`
        <ha-icon-button class='toggle-button ${this.toggleButtonCls()}'
          .icon=${ICON.TOGGLE}
          @click=${e => this.handleToggle(e)}>
        </ha-icon-button>
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

    const fanMode = this.buttons.fan_mode;
    const { selected } = fanMode;
    const label = selected ? selected.name : fanMode.state;

    return html`
      <div class='entity__secondary_info ellipsis'>
         <ha-icon class='entity__secondary_info_icon' .icon=${fanMode.icon}></ha-icon>
         <span class='entity__secondary_info__name'>${label}</span>
      </div>
    `;
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
