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
import IndicatorObject from './indicatorModel';
import ButtonObject from './buttonModel';

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
    this.buttons = {};
    this.indicators = {};

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

    this.updateIndicators(hass);
    this.updateButtons(hass);
    this.updateTemperature(hass);
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

    if (entries.length === 0) {
      fanModeConfig.functions.source.__init = e => ((e.attributes && e.attributes.fan_modes) || [])
        .map(f => ({ id: f, name: getLabel(this.hass, [`state_attributes.climate.fan_mode.${f}`], f) }));
    }

    if (!fanModeConfig.functions.change_action)
      fanModeConfig.functions.change_action = selected => this.climate.setFanMode(selected);

    if (!fanModeConfig.functions.active)
      fanModeConfig.functions.active = () => this.climate.isOn();

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
            .buttons=${this.buttons}>
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
            .indicators=${this.indicators}>
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
