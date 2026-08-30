import { getEntityValue } from '../utils/utils';
import ICON, { ACTION_TIMEOUT } from '../const';
import type { HassEntity, HvacModeConfig, SourceItem } from '../types';
import type ClimateObject from './climate';

export default class HvacModeObject {
  config: HvacModeConfig;

  entity: HassEntity;

  climate: ClimateObject;

  constructor(entity: HassEntity, config: HvacModeConfig, climate: ClimateObject) {
    this.config = config || ({} as HvacModeConfig);
    this.entity = entity || ({} as HassEntity);
    this.climate = climate || ({} as ClimateObject);
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

  get originalState() {
    return getEntityValue(this.entity, this.config.state);
  }

  get state() {
    let state = this.originalState;

    if (this.config.functions.state && this.config.functions.state.mapper) {
      state = this.config.functions.state.mapper(state, this.entity, this.climate.entity);
    }

    return state;
  }

  isActive(state: unknown): boolean {
    if (this.config.functions.active) {
      return this.config.functions.active(state, this.entity, this.climate.entity);
    }

    return false;
  }

  get disabled() {
    if (this.config.functions.disabled) {
      return this.config.functions.disabled(this.state, this.entity, this.climate.entity);
    }

    return false;
  }

  get style() {
    if (this.config.functions.style) {
      return this.config.functions.style(this.state, this.entity, this.climate.entity) || {};
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
      return functions.source.filter(source, this.state, this.entity, this.climate.entity);
    }

    return source;
  }

  get selected() {
    const { state } = this;
    if (state === undefined || state === null) return undefined;

    return this.source.find(s => s.id === state.toString());
  }

  get icon() {
    // Same fallbacks the control-row menu uses (`mode-menu.ts`), so the
    // dropdown under the name (#194) shows the mode's glyph without a new
    // option. A string `icon` or a template on `hvac_mode` wins, the way a
    // button's does.
    if (this.config.functions.icon && this.config.functions.icon.template) {
      return this.config.functions.icon.template(this.state, this.entity, this.climate.entity);
    }

    if (typeof this.config.icon === 'string' && this.config.icon) return this.config.icon;

    const selected = this.selected;
    if (selected?.icon) return selected.icon;

    if (selected?.id !== undefined && selected.id !== null) {
      const id = selected.id.toString().toUpperCase();
      if (id in ICON) return ICON[id];
    }

    return ICON.DEFAULT;
  }

  get actionTimeout() {
    const timeout = this.config.action_timeout;
    return typeof timeout === 'number' ? timeout : ACTION_TIMEOUT;
  }

  handleChange(selected: string) {
    if (this.config.functions.change_action) {
      return this.config.functions.change_action(selected, this.entity, this.climate.entity);
    }

    return undefined;
  }
}
