import { html, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import define from './utils/define';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import style from './style';
import sharedStyle from './sharedStyle';
import handleClick from './utils/handleClick';
import getLabel from './utils/getLabel';
import './initialize';

import { compileTemplate, toggleState } from './utils/utils';
import TemperatureObject from './models/temperature';
import TargetTemperatureObject from './models/target-temperature';
import ButtonObject from './models/button';
import IndicatorObject from './models/indicator';
import ClimateObject from './models/climate';
import HvacModeObject from './models/hvac-mode';
import ICON from './const';
import type {
  ButtonConfig,
  CardConfig,
  HassEntity,
  HomeAssistant,
  IndicatorConfig,
  RawCardConfig,
  Template,
  TemplateContext,
} from './types';
import './components/temperature';
import './components/target-temperature';
import './components/mode-menu';
import './components/indicators';
import './components/dropdown';
import './components/buttons';
import './components/button';
import './components/secondary-info';

class MiniClimate extends LitElement {
  config!: CardConfig;

  entity!: HassEntity;

  climate: ClimateObject;

  temperature: TemperatureObject;

  targetTemperature: TargetTemperatureObject;

  hvacMode: HvacModeObject;

  buttons: Record<string, ButtonObject>;

  indicators: Record<string, IndicatorObject>;

  /** The fan mode button, kept aside because its source is filled in from the
   * entity the first time the card renders. */
  fanModeConfig!: ButtonConfig;

  initial: boolean;

  toggle: boolean;

  swapTemperatures: boolean;

  targetTemperatureChanging: boolean;

  targetTemperatureValue: number | string;

  /**
   * Compiled once in `setConfig`, because it is read on every render - the
   * same reason `TemperatureObject` compiles `hide_current_temperature` in its
   * constructor rather than per frame.
   */
  shouldHideIcon: Template<boolean>;

  private _hass!: HomeAssistant;

  static getStubConfig(
    _hass: HomeAssistant,
    unusedEntities: string[],
    allEntities: string[],
  ): { entity: string | undefined } {
    let entity = unusedEntities.find(eid => eid.split('.')[0] === 'climate');
    if (!entity) {
      entity = allEntities.find(eid => eid.split('.')[0] === 'climate');
    }
    return { entity };
  }

  constructor() {
    super();
    this.initial = true;
    this.toggle = false;
    this.temperature = {} as TemperatureObject;
    this.targetTemperature = {} as TargetTemperatureObject;
    this.swapTemperatures = false;
    this.buttons = {};
    this.indicators = {};
    this.hvacMode = {} as HvacModeObject;
    this.targetTemperatureChanging = false;
    this.climate = {} as ClimateObject;
    this.targetTemperatureValue = 0;
    this.shouldHideIcon = () => false;
  }

  static override get properties() {
    return {
      _hass: { type: Object },
      config: { type: Object },
      entity: { type: Object },
      climate: { type: Object },
      initial: { type: Boolean },
      toggle: { type: Boolean },
    };
  }

  static override get styles() {
    return [sharedStyle, style];
  }

  set hass(hass: HomeAssistant) {
    if (!hass) return;
    const entity = hass.states[this.config.entity];
    this._hass = hass;
    let force = false;

    // Built even when `hass.states` holds nothing under `config.entity` - a
    // renamed or deleted entity, or an integration that drops an entity
    // instead of marking it unavailable (#46). The guard used to be
    // `entity && this.entity !== entity`, and with no entity `this.climate`
    // stayed the empty object the constructor puts there. A plain object has
    // no `isUnavailable` getter, so every render path that asks whether to
    // draw controls read `undefined`, drew them, and the components threw on
    // models built from nothing: an empty card, four exceptions a render.
    // The same guard also skipped the update when an entity that had been
    // there disappeared, leaving its last readings on screen as though they
    // were current.
    if (this.entity !== entity || !(this.climate instanceof ClimateObject)) {
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

  get hass(): HomeAssistant {
    return this._hass;
  }

  get name(): string {
    return this.config.name || this.climate.name;
  }

  updateIndicators(force: boolean): void {
    const indicators: Record<string, IndicatorObject> = {};
    let changed = false;

    for (let i = 0; i < this.config.indicators.length; i += 1) {
      const config = this.config.indicators[i];
      const { id } = config;

      const entityId = config.source.entity || this.climate.id;
      const entity = this.hass.states[entityId];

      if (entity) {
        indicators[id] = new IndicatorObject(entity, config, this.climate, this.hass);
      }

      if (entity !== (this.indicators[id] && this.indicators[id].entity)) changed = true;
    }

    if (changed || force) this.indicators = indicators;
  }

  updateTemperature(force: boolean): void {
    if (this.targetTemperatureChanging) return;

    const temperatureEntityId = this.config.temperature.source!.entity || this.config.entity;
    const temperatureEntity = this.hass.states[temperatureEntityId];

    const targetTemperatureEntityId =
      (this.config.target_temperature.source && this.config.target_temperature.source.entity) ||
      this.config.entity;

    const targetTemperatureEntity = this.hass.states[targetTemperatureEntityId];

    const temperature = new TemperatureObject(
      temperatureEntity,
      targetTemperatureEntity,
      this.config,
      this.climate,
    );

    if (this.temperature.rawValue !== temperature.rawValue || force) {
      this.temperature = temperature;
    }
  }

  updateTargetTemperature(force: boolean): void {
    if (this.targetTemperatureChanging) return;

    const entityId =
      (this.config.target_temperature.source && this.config.target_temperature.source.entity) ||
      this.config.entity;

    const entity = this.hass.states[entityId];

    if (this.targetTemperature.entity !== entity || force) {
      this.targetTemperature = new TargetTemperatureObject(entity, this.config, this.hass);
      this.targetTemperatureValue = this.targetTemperature.value;
    }
  }

  updateHvacMode(force: boolean): void {
    const config = this.config.hvac_mode;

    const entityId = (config.state && config.state.entity) || this.climate.id;
    const entity = this.hass.states[entityId];

    if ((entity && entity !== (this.hvacMode && this.hvacMode.entity)) || force) {
      this.hvacMode = new HvacModeObject(entity, config, this.climate);
    }
  }

  updateButtons(force: boolean): void {
    const buttons: Record<string, ButtonObject> = {};
    let changed = false;

    for (let i = 0; i < this.config.buttons.length; i += 1) {
      const config = this.config.buttons[i];
      const { id } = config;

      const entityId = (config.state && config.state.entity) || this.climate.id;
      const entity = this.hass.states[entityId];

      if (entity) {
        buttons[id] = new ButtonObject(entity, config, this.climate, this.hass);
      }

      if (entity !== (this.buttons[id] && this.buttons[id].entity)) changed = true;
    }

    if (changed || force) {
      this.buttons = buttons;
    }
  }

  getButtonsConfig(config: RawCardConfig): ButtonConfig[] {
    const data = Object.entries(config.buttons || {});

    const buttons = [];

    for (let i = 0; i < data.length; i += 1) {
      const [key, value] = data[i];
      const button = this.getButtonConfig(value, config);
      button.id = key;

      if (!('order' in button)) button.order = i + 1;

      buttons.push(button);
    }

    return buttons;
  }

  getButtonConfig(value: any, config: RawCardConfig): ButtonConfig {
    const item: any = {
      icon: 'mdi:radiobox-marked',
      type: 'button',
      toggle_action: undefined,
      ...value,
    };

    item.functions = {};

    const context = { ...value };
    context.call_service = (domain: string, service: string, options: Record<string, unknown>) =>
      this.hass.callService(domain, service, options);
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

    if (item.style) item.functions.style = compileTemplate(item.style, context);

    if (item.hide) {
      if (typeof item.hide === 'boolean') {
        item.functions.hide = () => true;
      } else {
        item.functions.hide = compileTemplate(item.hide, context);
      }
    }

    return item;
  }

  getFanModeConfig(config: RawCardConfig): ButtonConfig {
    let fanModeConfig: any = {
      id: 'fan_mode',
      icon: 'mdi:fan',
      type: 'dropdown',
      order: 0,
      state: { attribute: 'fan_mode' },
      // Written as a function, but it does not run as one from here.
      // `getButtonConfig` puts it through `compileTemplate` like any string a
      // user wrote: the text is re-parsed and called with the template context
      // bound, so `this` below is that context and not the card. The cast says
      // so and erases, which matters - the emitted text is what gets parsed.
      change_action: (selected: string, _state: unknown, entity: HassEntity) => {
        const options = { fan_mode: selected, entity_id: entity.entity_id };
        return (this as unknown as TemplateContext).call_service(
          'climate',
          'set_fan_mode',
          options,
        );
      },
      ...(config.fan_mode || {}),
    };

    fanModeConfig = this.getButtonConfig(fanModeConfig, config);
    const { functions } = fanModeConfig;

    if (!functions.active) functions.active = () => this.climate.isOn;

    return fanModeConfig;
  }

  getIndicatorConfig(key: string, value: any, config: RawCardConfig): IndicatorConfig {
    const item: any = {
      id: key,
      source: { enitity: undefined, attribute: undefined, mapper: undefined },
      icon: '',
      ...value,
    };

    if (typeof value.tap_action === 'string') item.tap_action = { action: value.tap_action };
    else item.tap_action = { action: 'none', ...(item.tap_action || {}) };

    item.functions = item.functions || {};
    const context = { ...value };
    context.entity_config = config;
    context.toggle_state = toggleState;

    if (item.source.mapper) item.functions.mapper = compileTemplate(item.source.mapper, context);

    if (typeof item.icon === 'object') {
      item.functions.icon = {};

      if (item.icon.template)
        item.functions.icon.template = compileTemplate(item.icon.template, context);

      if (item.icon.style) item.functions.icon.style = compileTemplate(item.icon.style, context);
    }

    if (typeof item.value === 'object') {
      item.functions.value = {};

      if (item.value.style) item.functions.value.style = compileTemplate(item.value.style, context);
    }

    if (typeof item.unit === 'object') {
      item.functions.unit = {};

      if (item.unit.template)
        item.functions.unit.template = compileTemplate(item.unit.template, context);
    }

    if (item.hide) {
      if (typeof item.hide === 'boolean') {
        item.functions.hide = () => true;
      } else {
        item.functions.hide = compileTemplate(item.hide, context);
      }
    }

    return item;
  }

  getSecondaryInfoConfig(config: any): any {
    const item: any = {
      ...config,
    };

    item.functions = item.functions || {};
    const context = { ...config };

    if (item.hide) {
      if (typeof item.hide === 'boolean') {
        item.functions.hide = () => true;
      } else {
        item.functions.hide = compileTemplate(item.hide, context);
      }
    }

    return item;
  }

  getToggleConfig(config: any): any {
    const item: any = {
      ...config,
    };

    item.functions = item.functions || {};
    const context = { ...config };

    if (item.hide) {
      if (typeof item.hide === 'boolean') {
        item.functions.hide = () => true;
      } else {
        item.functions.hide = compileTemplate(item.hide, context);
      }
    }

    return item;
  }

  getIndicatorsConfig(config: RawCardConfig): IndicatorConfig[] {
    return Object.entries(config.indicators || {}).map(i =>
      this.getIndicatorConfig(i[0], i[1] || {}, config),
    );
  }

  getTargetTemperatureConfig(config: RawCardConfig): any {
    const item: any = {
      source: { entity: undefined, attribute: 'temperature' },
      ...(config.target_temperature || {}),
    };

    item.icons = {
      up: ICON.UP,
      down: ICON.DOWN,
      ...(item.icons || {}),
    };

    item.functions = {};

    const context = { ...(config.target_temperature || {}) };
    context.call_service = (domain: string, service: string, options: Record<string, unknown>) =>
      this.hass.callService(domain, service, options);
    context.entity_config = config;
    context.toggle_state = toggleState;

    if (item.change_action) {
      item.functions.change_action = compileTemplate(item.change_action, context);
    }

    return item;
  }

  getHvacModeConfig(config: RawCardConfig): any {
    let mode: any = {
      type: 'dropdown',
      // As in getFanModeConfig: re-parsed by compileTemplate, so `this` is
      // the template context.
      change_action: (selected: string, entity: HassEntity) => {
        const options = { hvac_mode: selected, entity_id: entity.entity_id };
        return (this as unknown as TemplateContext).call_service(
          'climate',
          'set_hvac_mode',
          options,
        );
      },
      ...(config.hvac_mode || {}),
    };

    mode = this.getButtonConfig(mode, this.config);

    const { functions } = mode;

    if (!functions.active) functions.active = () => this.climate.isOn;

    return mode;
  }

  setConfig(config: RawCardConfig): void {
    const supportedDomains = ['climate', 'fan'];

    if (!config.entity || supportedDomains.includes(config.entity.split('.')[0]) === false)
      throw new Error(`Specify an entity from within domains: [${supportedDomains.join(', ')}].`);

    // The cast is load-bearing rather than cosmetic: `RawCardConfig` allows
    // `tap_action` as a string, and the spread carries that string over the
    // default object. The statement after it is what makes the cast true.
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
    } as CardConfig;

    // A bare string is how the documented `tap_action: none` is written, and
    // written that way it replaced the whole default object. `handleClick`
    // reads `config.action` off a string and returns, so every value but
    // `none` was a dead click - and `none` only appeared to work, because
    // doing nothing is what it asks for. `getIndicatorConfig` has always
    // normalised the same shorthand for indicators; this is that line, in the
    // one place it was missing (#234).
    if (typeof config.tap_action === 'string')
      this.config.tap_action = { action: config.tap_action };

    // `hide_icon` is a boolean or a template, like every other hide in this
    // card: `hide_current_temperature`, `toggle.hide`, an indicator's and a
    // button's. A boolean-only option would be the one exception, and the
    // first question about it would be how to hide the icon only while the
    // unit is off (#169).
    const hideIcon = config.hide_icon;

    this.shouldHideIcon =
      typeof hideIcon === 'string'
        ? compileTemplate(hideIcon, this.config)
        : () => hideIcon === true;

    this.config.indicators = this.getIndicatorsConfig(config);

    this.config.buttons = this.getButtonsConfig(config);

    this.fanModeConfig = this.getFanModeConfig(config);

    this.config.buttons.push(this.fanModeConfig);

    this.config.target_temperature = this.getTargetTemperatureConfig(config);

    this.config.temperature = {
      round: 1,
      source: { entity: undefined, attribute: 'current_temperature' },
      ...(config.temperature || {}),
    };

    this.config.hvac_mode = this.getHvacModeConfig(this.config);

    this.config.toggle = this.getToggleConfig({
      icon: ICON.TOGGLE,
      hide: false,
      default: false,
      ...(config.toggle || {}),
    });

    if (typeof config.secondary_info === 'string') {
      this.config.secondary_info = { type: config.secondary_info };
    } else {
      this.config.secondary_info = {
        type: 'fan_mode',
        ...(config.secondary_info || {}),
      };
    }
    this.config.secondary_info = this.getSecondaryInfoConfig(this.config.secondary_info);

    this.toggle = this.config.toggle.default;

    this.swapTemperatures = !!this.config.swap_temperatures;
  }

  renderCtlWrap(): TemplateResult | string {
    if (this.climate.isUnavailable) {
      return html`
        <span class="label ellipsis">        
          ${getLabel(this.hass, ['state.default.unavailable'], 'Unavailable')}
        </span>
      `;
    }

    const buttons = Object.entries(this.buttons)
      .map(b => b[1])
      .filter(b => b.location === 'main' && !b.hide)
      .sort((a, b) =>
        (a.order as number) > (b.order as number)
          ? 1
          : (b.order as number) > (a.order as number)
            ? -1
            : 0,
      );

    return html`
        ${buttons.map(button =>
          button.type === 'dropdown'
            ? html`<mc-dropdown .dropdown=${button}></mc-dropdown>`
            : html`<mc-button .button=${button}></mc-button>`,
        )}
        ${this.hvacMode.hide ? '' : html`<mc-mode-menu .mode=${this.hvacMode}></mc-mode-menu>`}
        <mc-temperature
          .temperature=${this.temperature}
          .target=${this.targetTemperatureValue}
          .changing=${this.targetTemperatureChanging}
          .swapTemperatures=${this.swapTemperatures}>
        </mc-temperature>
    `;
  }

  renderEntityControls(): TemplateResult | string {
    if (this.climate.isUnavailable) return '';

    return html`
        <div class="entity__controls">
          <mc-target-temperature
            .targetTemperature=${this.targetTemperature}
            @changing="${(e: CustomEvent) => this.handleChangingTargetTemperature(e)}">
          </mc-target-temperature>
        </div>
    `;
  }

  override render(): TemplateResult {
    const handle = this.config.secondary_info.type !== 'fan-mode-dropdown';
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
                <div class="entity__info__name_wrap" @click=${(e: Event) => this.handlePopup(e, handle)}>
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

  handleChangingTargetTemperature(e: CustomEvent): void {
    this.targetTemperatureValue = this.targetTemperature.value;
    this.targetTemperatureChanging = e.detail.changing;
    this.requestUpdate('targetTemperatureChanging');
  }

  handlePopup(e: Event, handle: boolean): void {
    if (!handle) return;

    e.stopPropagation();
    handleClick(this, this.hass, this.config.tap_action, this.climate.id);
  }

  handleToggle(e: Event): void {
    e.stopPropagation();
    this.toggle = !this.toggle;
  }

  toggleButtonCls(): string {
    return this.toggle ? 'open' : '';
  }

  renderIcon(): TemplateResult {
    if (this.shouldHideIcon(this.climate.entity, this.climate.mode)) return html``;

    const state = this.climate.isActive;
    return html`
      <div class='entity__icon' ?color=${state}>
        <ha-icon .icon=${this.computeIcon()} ></ha-icon>
      </div>`;
  }

  renderTogglePanel(): TemplateResult | string {
    if (!this.toggle) return '';

    return html`
        <div class="mc-toggle_content">
          <mc-buttons
            .buttons=${this.buttons}>
          </mc-buttons>
        </div>
    `;
  }

  renderBottomPanel(): TemplateResult | string {
    if (this.climate.isUnavailable) return '';

    return html`
        <div class='bottom flex'>
          <mc-indicators
            .indicators=${this.indicators}>
          </mc-indicators>
          ${this.renderToggleButton()}
        </div>
    `;
  }

  renderToggleButton(): TemplateResult {
    if (
      Object.entries(this.buttons)
        .map(entry => entry[1])
        .filter(button => !button.hide && button.location !== 'main').length === 0
    )
      return html``;

    if (
      this.config.toggle.functions.hide &&
      this.config.toggle.functions.hide(this.climate.entity, this.climate.mode)
    ) {
      return html``;
    }

    return html`
        <ha-icon-button class='toggle-button ${this.toggleButtonCls()}'
          .icon=${this.config.toggle.icon}
          @click=${(e: Event) => this.handleToggle(e)}>
            <ha-icon .icon=${this.config.toggle.icon}></ha-icon>
        </ha-icon-button>
    `;
  }

  renderEntityName(): TemplateResult {
    return html`
      <div class='entity__info__name' @click=${(e: Event) => this.handlePopup(e, true)}>
        ${this.name}
      </div>
     ${this.renderSecondaryInfo()}
    `;
  }

  /**
   * Read twice per render - once to decide whether to draw the line, once by
   * `computeClasses` so the styles can centre the name that is then alone in
   * its row (#100).
   */
  secondaryInfoHidden(): boolean {
    if (this.climate.isUnavailable) return true;

    return Boolean(
      this.config.secondary_info.functions.hide &&
      this.config.secondary_info.functions.hide(this.climate.entity, this.climate.mode),
    );
  }

  renderSecondaryInfo(): TemplateResult {
    if (this.secondaryInfoHidden()) return html``;

    return html`
      <div class='entity__secondary_info ellipsis'>
        <mc-secondary-info
          .climate=${this.climate}
          .config=${this.config}
          .hvacMode=${this.hvacMode}
          .fanMode=${this.buttons.fan_mode}>
        </mc-secondary-info>
      </div>`;
  }

  computeIcon(): string {
    return this.config.icon ? this.config.icon : this.climate.icon || ICON.DEFAULT;
  }

  computeClasses({ config } = this) {
    return classMap({
      '--initial': this.initial,
      '--group': config.group,
      '--more-info': config.tap_action.action !== 'none',
      '--inactive': !this.climate.isActive,
      '--unavailable': this.climate.isUnavailable,
      '--no-secondary-info': this.secondaryInfoHidden(),
    });
  }

  computeStyles() {
    const { scale } = this.config;

    return styleMap({
      ...(scale && { '--mc-unit': `${40 * scale}px` }),
    });
  }

  initDefaultFanModeSource(): void {
    const fanMode = this.fanModeConfig;
    const entries = Object.entries(fanMode.source || {}).filter(s => s[0] !== '__filter');
    const { entity } = this.climate;

    if (entity && entries.length === 0 && entity.attributes && entity.attributes.fan_modes) {
      fanMode.source = { ...this.climate.defaultFanModes, ...(fanMode.source || {}) };
    }
  }

  initDefaultHvacModeSource(): void {
    const hvacMode = this.config.hvac_mode;
    const entries = Object.entries(hvacMode.source || {}).filter(s => s[0] !== '__filter');
    const { entity } = this.climate;

    if (entity && entries.length === 0)
      hvacMode.source = { ...this.climate.defaultHvacModes, ...(hvacMode.source || {}) };
  }

  override firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);

    if (changedProps.has('climate')) {
      this.initDefaultFanModeSource();
      this.initDefaultHvacModeSource();
      this.requestUpdate('climate');
    }
    if (changedProps.has('targetTemperature')) {
      this.targetTemperatureValue = this.targetTemperature.value;
      this.requestUpdate('targetTemperatureValue');
    }
  }
}

define('mini-climate', MiniClimate);

// The list the Lovelace card picker reads. It belongs to the frontend, not to
// this card, so it is declared rather than imported.
declare global {
  interface Window {
    customCards?: Array<Record<string, unknown>>;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'mini-climate',
  name: 'Mini Climate',
  preview: true,
  description: 'A custom climate card',
  documentationURL: 'https://github.com/artem-sedykh/mini-climate-card',
});
