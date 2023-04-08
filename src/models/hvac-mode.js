import { getEntityValue } from '../utils/utils';

export default class HvacModeObject {
  constructor(entity, config, climate) {
    this.config = config || {};
    this.entity = entity || {};
    this.climate = climate || {};
  }

  get hide() {
    if (this.config.functions.hide) {
      return this.config.functions.hide(this.state, this.entity,
        this.climate.entity, this.climate.mode);
    }

    return false;
  }

  get originalState() {
    return getEntityValue(this.entity, this.config.state);
  }

  get state() {
    let state = this.originalState;

    if (this.config.functions.state && this.config.functions.state.mapper) {
      state = this.config.functions.state.mapper(state, this.entity,
        this.climate.entity);
    }

    return state;
  }

  isActive(state) {
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

  get source() {
    const { functions } = this.config;
    let source = Object.entries(this.config.source || {})
      .filter(([key]) => key !== '__filter')
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return { id: key, ...value || {} };
        }
        return { id: key, name: value };
      });

    if (source.some(s => 'order' in s))
      source = source.sort((a, b) => ((a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0)));

    if (functions.source && functions.source.filter) {
      return functions.source.filter(source, this.state, this.entity, this.climate.entity);
    }

    return source;
  }

  get selected() {
    const { state } = this;
    if (state === undefined || state === null)
      return undefined;

    return this.source.find(s => s.id === state.toString());
  }

  handleChange(selected) {
    if (this.config.functions.change_action) {
      return this.config.functions.change_action(selected, this.entity, this.climate.entity);
    }

    return undefined;
  }
}
