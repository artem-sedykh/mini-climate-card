import { html, LitElement } from 'lit-element';
import ResizeObserver from 'resize-observer-polyfill';
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
import TemperatureObject from './models/temperature';
import TargetTemperatureObject from './models/targetTemperature';
import ButtonObject from './models/button';
import IndicatorObject from './models/indicator';
import ClimateObject from './models/climate';
import HvacModeObject from './models/hvac_mode';
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
    this.temperature = {};
    this.targetTemperature = {};
    this.buttons = {};
    this.indicators = {};
    this.hvacMode = {};
    this.targetTemperatureChanging = false;
    this.climate = {};
    this.targetTemperatureValue = 0;
    this.width = 0;
  }

  static get properties() {
    return {
      _hass: { type: Object },
      config: { type: Object },
      entity: { type: Object },
      climate: { type: Object },
      initial: { type: Boolean },
      toggle: { type: Boolean },
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
    let force = false;

    if (entity && this.entity !== entity) {
      this.entity = entity;
      this.climate = new ClimateObject(hass, this.config, entity);
      force = true;
    }

    this.updateIndicators(force);
    this.updateButtons(force);
    this.updateTemperature(force);
    this.updateTargetTemperature(force);
    this.updateHvacMode(force);

    this.climate.mode = this.hvacMode.selected;
  }

  get hass() {
    return this._hass;
  }

  get name() {
    return this.config.name || this.climate.name;
  }

  updateIndicators(force) {
    const indicators = { };
    let changed = false;

    for (let i = 0; i < this.config.indicators.length; i += 1) {
      const config = this.config.indicators[i];
      const { id } = config;

      const entityId = config.source.entity || this.climate.id;
      const entity = this.hass.states[entityId];

      if (entity) {
        indicators[id] = new IndicatorObject(entity, config, this.climate, this.hass);
      }

      if (entity !== (this.indicators[id] && this.indicators[id].entity))
        changed = true;
    }

    if (changed || force)
      this.indicators = indicators;
  }

  updateTemperature(force) {
    if (this.targetTemperatureChanging)
      return;

    const temperatureEntityId = this.config.temperature.source.entity || this.config.entity;
    const temperatureEntity = this.hass.states[temperatureEntityId];

    const targetTemperatureEntityId = (this.config.target_temperature.source
      && this.config.target_temperature.source.entity) || this.config.entity;

    const targetTemperatureEntity = this.hass.states[targetTemperatureEntityId];

    const temperature = new TemperatureObject(temperatureEntity, targetTemperatureEntity,
      this.config);

    if (this.temperature.rawValue !== temperature.rawValue
      || this.temperature.target !== temperature.target || force) {
      this.temperature = temperature;
    }
  }

  updateTargetTemperature(force) {
    if (this.targetTemperatureChanging)
      return;

    const entityId = (this.config.target_temperature.source
      && this.config.target_temperature.source.entity) || this.config.entity;

    const entity = this.hass.states[entityId];

    if (this.targetTemperature.entity !== entity || force) {
      this.targetTemperature = new TargetTemperatureObject(entity, this.config, this.hass);
      this.targetTemperatureValue = this.targetTemperature.value;
    }
  }

  updateHvacMode(force) {
    const config = this.config.hvac_mode;

    const entityId = (config.state && config.state.entity) || this.climate.id;
    const entity = this.hass.states[entityId];

    if ((entity && entity !== (this.hvacMode && this.hvacMode.entity)) || force) {
      this.hvacMode = new HvacModeObject(entity, config, this.climate);
    }
  }

  updateButtons(force) {
    const buttons = { };
    let changed = false;

    for (let i = 0; i < this.config.buttons.length; i += 1) {
      const config = this.config.buttons[i];
      const { id } = config;

      const entityId = (config.state && config.state.entity) || this.climate.id;
      const entity = this.hass.states[entityId];

      if (entity) {
        buttons[id] = new ButtonObject(entity, config, this.climate, this.hass);
      }

      if (entity !== (this.buttons[id] && this.buttons[id].entity))
        changed = true;
    }

    if (changed || force) {
      this.buttons = buttons;
    }
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

    if (typeof value.tap_action === 'string')
      item.tap_action = { action: value.tap_action };
    else
      item.tap_action = { action: 'none', ...item.tap_action || {} };

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
      .map(i => this.getIndicatorConfig(i[0], i[1] || {}, config))
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
    let mode = {
      type: 'dropdown',
      change_action: (selected, entity) => {
        const options = { hvac_mode: selected, entity_id: entity.entity_id };
        return this.call_service('climate', 'set_hvac_mode', options);
      },
      ...config.hvac_mode || {},
    };

    mode = this.getButtonConfig(mode, this.config);

    const { functions } = mode;

    if (!functions.active)
      functions.active = () => this.climate.isOn;

    return mode;
  }

  setConfig(config) {
    const supportedDomains = ['climate', 'fan'];

    if (!config.entity || supportedDomains.includes(config.entity.split('.')[0]) === false)
      throw new Error(`Specify an entity from within domains: [${supportedDomains.join(', ')}].`);

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

    if (typeof config.secondary_info === 'string') {
      this.config.secondary_info = { type: config.secondary_info };
    } else {
      this.config.secondary_info = {
        type: 'fan_mode',
        ...config.secondary_info || {},
      };
    }

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
          .mode=${this.hvacMode}>
        </mc-mode-menu>
        <mc-temperature
          .temperature=${this.temperature}
          .target=${this.targetTemperatureValue}
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
            .targetTemperature=${this.targetTemperature}
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
    this.targetTemperatureValue = this.targetTemperature.value;
    this.targetTemperatureChanging = e.detail.changing;
    return this.requestUpdate('targetTemperatureChanging');
  }

  handlePopup(e) {
    e.stopPropagation();
    handleClick(this, this.hass, this.config.tap_action, this.climate.id);
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
          <mc-indicators
            .indicators=${this.indicators}>
          </mc-indicators>
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

    if (this.config.secondary_info.type === 'last-changed') {
      return html`
        <div class='entity__secondary_info ellipsis'>
            <ha-relative-time
              .hass=${this.hass}
              .datetime=${this.entity.last_changed}>
            </ha-relative-time>
        </div>
      `;
    }

    if (this.config.secondary_info.type === 'hvac-mode') {
      const { hvacMode } = this;
      const selected = hvacMode.selected || {};
      const icon = this.config.secondary_info.icon
        ? this.config.secondary_info.icon : selected.icon;

      return html`
        <div class='entity__secondary_info ellipsis'>
        ${icon ? html`<ha-icon class='entity__secondary_info_icon' .icon=${icon}></ha-icon>` : ''}
         <span class='entity__secondary_info__name'>${selected.name}</span>
        </div>
      `;
    }

    const fanMode = this.buttons.fan_mode;
    const { selected } = fanMode;
    const label = selected ? selected.name : fanMode.state;
    const icon = this.config.secondary_info.icon ? this.config.secondary_info.icon : fanMode.icon;

    return html`
      <div class='entity__secondary_info ellipsis'>
         <ha-icon class='entity__secondary_info_icon' .icon=${icon}></ha-icon>
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
      ...{ '--mc-card-width': `${this.width}px` },
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

  initDefaultHvacModeSource() {
    const hvacMode = this.config.hvac_mode;
    const entries = Object.entries(hvacMode.source || {}).filter(s => s[0] !== '__filter');
    const { entity } = this.climate;

    if (entity && entries.length === 0)
      hvacMode.source = { ...this.climate.defaultHvacModes, ...hvacMode.source || {} };
  }

  firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    if (changedProps.has('climate')) {
      this.initDefaultFanModeSource();
      this.initDefaultHvacModeSource();
      this.requestUpdate('climate').then();
    }
    if (changedProps.has('targetTemperature')) {
      this.targetTemperatureValue = this.targetTemperature.value;
      this.requestUpdate('targetTemperatureValue').then();
    }

    const ro = new ResizeObserver((entries) => {
      const item = entries.find(e => e.target === this);
      if (item && item.contentRect && this.width !== item.contentRect.width) {
        this.width = item.contentRect.width;
        this.requestUpdate('width').then();
      }
    });

    ro.observe(this);
  }
}

customElements.define('mini-climate', MiniClimate);
