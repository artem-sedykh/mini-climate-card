import { html, LitElement } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { styleMap } from 'lit-html/directives/style-map';
import style from './style';
import sharedStyle from './sharedStyle';
import handleClick from './utils/handleClick';
import getLabel from './utils/getLabel';
import './initialize';
import './components/indicators';
import './components/modeMenu';
import './components/buttons';
import './components/temperature';
import './components/targetTemperature';
import { compileTemplate, toggleState } from './utils/utils';
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
    this.climate = {};
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
      const button = this.getButtonConfig(value, config);
      button.id = key;

      if (!('order' in button))
        button.order = i + 1;

      buttons.push(button);
    }

    return buttons;
  }

  getButtonConfig(value, config) {
    const item = {
      icon: 'mdi:radiobox-marked',
      type: 'button',
      toggle_action: undefined,
      ...value,
    };

    item.functions = {};

    const context = { ...value };
    context.call_service = (domain, service, options) => this.hass.callService(
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
      id: 'fan_mode',
      icon: 'mdi:fan',
      type: 'dropdown',
      order: 0,
      state: { attribute: 'fan_mode' },
      change_action: (selected, state, entity) => {
        const options = { fan_mode: selected, entity_id: entity.entity_id };
        return this.call_service('climate', 'set_fan_mode', options);
      },
      ...config.fan_mode || {},
    };

    fanModeConfig = this.getButtonConfig(fanModeConfig, config);
    const { functions } = fanModeConfig;

    if (!functions.active)
      functions.active = () => this.climate.isOn;

    return fanModeConfig;
  }

  getIndicatorConfig(key, value, config) {
    const item = {
      id: key,
      source: { enitity: undefined, attribute: undefined, mapper: undefined },
      icon: '',
      ...value,
    };

    item.functions = item.functions || {};
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

    return item;
  }

  getIndicatorsConfig(config) {
    return Object.entries(config.indicators || {})
      .map(i => this.getIndicatorConfig(i[0], i[1], config))
      .filter(i => !i.hide);
  }

  getTargetTemperatureConfig(config) {
    const item = {
      unit: '°C',
      source: { entity: undefined, attribute: 'temperature' },
      ...config.target_temperature || {},
    };

    item.icons = {
      up: ICON.UP,
      down: ICON.DOWN,
      ...item.icons || {},
    };

    item.functions = {};

    const context = { ...config.target_temperature || {} };
    context.call_service = (domain, service, options) => this.hass.callService(
      domain, service, options,
    );
    context.entity_config = config;
    context.toggle_state = toggleState;

    if (item.change_action) {
      item.functions.change_action = compileTemplate(item.change_action, context);
    }

    return item;
  }

  getHvacModeConfig(config) {
    const item = { ...config.hvac_mode || {} };

    item.functions = {};

    const context = { ...config.hvac_mode || {} };
    context.call_service = (domain, service, options) => this.hass.callService(
      domain, service, options,
    );
    context.entity_config = config;
    context.toggle_state = toggleState;

    if (item.change_action)
      item.functions.change_action = compileTemplate(item.change_action, context);

    if (item.style)
      item.functions.style = compileTemplate(item.style, context);

    return item;
  }

  setConfig(config) {
    if (!config.entity || config.entity.split('.')[0] !== 'climate')
      throw new Error('Specify an entity from within the climate domain.');

    this.config = {
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

    this.fanModeConfig = this.getFanModeConfig(config);

    this.config.buttons.push(this.fanModeConfig);

    this.config.target_temperature = this.getTargetTemperatureConfig(config);

    this.config.temperature = {
      round: 1,
      unit: '°C',
      source: { entity: undefined, attribute: 'current_temperature' },
      ...config.temperature || {},
    };

    this.config.hvac_mode = this.getHvacModeConfig(this.config);

    this.config.toggle = {
      icon: ICON.TOGGLE,
      hide: false,
      default: false,
      ...config.toggle || {},
    };

    this.toggle = this.config.toggle.default;
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
          .climate=${this.climate}
          .config=${this.config.hvac_mode}>
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
        style=${this.computeStyles()}>
        <div class='mc__bg'></div>
        <div class='mc-climate'>
          <div class='mc-climate__core flex'>
            ${this.renderIcon()}
            <div class='entity__info'>
              <div class="wrap">
                <div class="entity__info__name_wrap"
                  @click=${e => this.handlePopup(e)}>
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

    if (this.config.toggle.hide)
      return '';

    return html`
        <ha-icon-button class='toggle-button ${this.toggleButtonCls()}'
          .icon=${this.config.toggle.icon}
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

  initDefaultFanModeSource() {
    const fanMode = this.fanModeConfig;
    const entries = Object.entries(fanMode.source || {}).filter(s => s[0] !== '__filter');
    const { entity } = this.climate;

    if (entity && entries.length === 0 && entity.attributes && entity.attributes.fan_modes) {
      fanMode.source = { ...this.climate.defaultFanModes, ...fanMode.source || {} };
    }
  }

  firstUpdated(changedProps) {
    if (changedProps.has('climate')) {
      this.initDefaultFanModeSource();
      this.requestUpdate('climate').then();
    }
  }
}

customElements.define('mini-climate', MiniClimate);
