import { getEntityValue } from '../utils/utils';
import { ACTION_TIMEOUT, STATES_OFF, UNAVAILABLE_STATES } from '../const';
import type { ButtonConfig, HassEntity, HomeAssistant, SourceItem } from '../types';
import type ClimateObject from './climate';

export default class ButtonObject {
  config: ButtonConfig;

  entity: HassEntity;

  climate: ClimateObject;

  private _hass: HomeAssistant;

  constructor(
    entity: HassEntity,
    config: ButtonConfig,
    climate: ClimateObject,
    hass: HomeAssistant,
  ) {
    this.config = config || ({} as ButtonConfig);
    this.entity = entity || ({} as HassEntity);
    this.climate = climate || ({} as ClimateObject);
    this._hass = hass || ({} as HomeAssistant);
  }

  get id() {
    return this.config.id;
  }

  get location() {
    return this.config.location || 'bottom';
  }

  get hass() {
    return this._hass;
  }

  get type() {
    return this.config.type;
  }

  get order() {
    return this.config.order;
  }

  get hide() {
    if (this.config.functions.hide) {
      return this.config.functions.hide(
        this.state,
        this.entity,
        this.climate.entity,
        this.climate.mode,
      );
    }

    return false;
  }

  get icon() {
    return this.config.icon;
  }

  get originalState() {
    return getEntityValue(this.entity, this.config.state);
  }

  get state() {
    let state = this.originalState;

    if (this.config.functions.state && this.config.functions.state.mapper) {
      state = this.config.functions.state.mapper(
        state,
        this.entity,
        this.climate.entity,
        this.climate.mode,
      );
    }

    return state;
  }

  isActive(state: unknown): boolean {
    if (this.config.functions.active) {
      return this.config.functions.active(
        state,
        this.entity,
        this.climate.entity,
        this.climate.mode,
      );
    }

    return false;
  }

  get isUnavailable() {
    return this.entity === undefined || UNAVAILABLE_STATES.includes(this.state);
  }

  get isOn() {
    return (
      this.entity !== undefined &&
      !STATES_OFF.includes(this.state) &&
      !UNAVAILABLE_STATES.includes(this.state)
    );
  }

  get disabled() {
    if (this.config.functions.disabled) {
      return this.config.functions.disabled(
        this.state,
        this.entity,
        this.climate.entity,
        this.climate.mode,
      );
    }

    return false;
  }

  get style() {
    if (this.config.functions.style) {
      return (
        this.config.functions.style(
          this.state,
          this.entity,
          this.climate.entity,
          this.climate.mode,
        ) || {}
      );
    }

    return {};
  }

  get source(): SourceItem[] {
    const { functions } = this.config;
    let source: SourceItem[] = Object.entries(this.config.source || {})
      .filter(([key]) => key !== '__filter')
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return { id: key, ...(value || {}) };
        }
        return { id: key, name: value };
      });

    if (source.some(s => 'order' in s))
      source = source.sort((a, b) =>
        (a.order as number) > (b.order as number)
          ? 1
          : (b.order as number) > (a.order as number)
            ? -1
            : 0,
      );

    if (functions.source && functions.source.filter) {
      return functions.source.filter(
        source,
        this.state,
        this.entity,
        this.climate.entity,
        this.climate.mode,
      );
    }

    return source;
  }

  get selected() {
    const { state } = this;
    if (state === undefined || state === null) return undefined;

    return this.source.find(s => s.id === state.toString());
  }

  get actionTimeout() {
    if ('action_timeout' in this.config) return this.config.action_timeout;

    return ACTION_TIMEOUT;
  }

  handleToggle() {
    if (this.config.functions.toggle_action) {
      return this.config.functions.toggle_action(
        this.state,
        this.entity,
        this.climate.entity,
        this.climate.mode,
      );
    }

    return this.climate.callService('switch', 'toggle', { entity_id: this.entity.entity_id });
  }

  handleChange(selected: string) {
    if (this.config.functions.change_action) {
      return this.config.functions.change_action(
        selected,
        this.state,
        this.entity,
        this.climate.entity,
        this.climate.mode,
      );
    }

    return undefined;
  }
}
