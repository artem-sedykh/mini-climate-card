import { getEntityValue } from './utils/utils';

export default class ButtonObject {
  constructor(entity, config, climate) {
    this.config = config || {};
    this.entity = entity || {};
    this.climate = climate || {};
  }

  get id() {
    return this.config.id;
  }

  get type() {
    return this.config.type;
  }

  get order() {
    return this.config.order;
  }

  get hide() {
    return this.config.hide;
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
      state = this.config.functions.state.mapper(state, this.entity,
        this.climate.entity, this.climate.mode);
    }

    return state;
  }

  get isActive() {
    if (this.config.functions.active) {
      return this.config.functions.active(this.state, this.entity,
        this.climate.entity, this.climate.mode);
    }

    return false;
  }

  get isUnavailable() {
    return !this.state || this.state.toString().trim().toUpperCase() === 'UNAVAILABLE';
  }

  get isOff() {
    return this.state && this.state.toString().trim().toUpperCase() === 'OFF';
  }

  get isOn() {
    return (this.isOff === false && this.isUnavailable === false) || false;
  }

  get disabled() {
    if (this.config.functions.disabled) {
      return this.config.functions.disabled(this.state, this.entity,
        this.climate.entity, this.climate.mode);
    }

    return false;
  }

  get style() {
    if (this.config.functions.style) {
      return this.config.functions.style(this.state, this.entity,
        this.climate.entity, this.climate.mode) || {};
    }

    return {};
  }

  get source() {
    const { functions } = this.config;
    let source;
    if (functions && functions.source && functions.source.__init) {
      source = functions.source.__init(this.entity, this.config);
    } else {
      source = Object.entries(this.config.source || {})
        .filter(s => s[0] !== '__filter')
        .map(s => ({ id: s[0], name: s[1] }));
    }

    if (this.config.functions.source && this.config.functions.source.filter) {
      return this.config.functions.source.filter(source, this.state, this.entity,
        this.climate.entity, this.climate.mode);
    }

    return source;
  }

  get selected() {
    return this.source.find(s => s.id === this.state);
  }

  handleToggle(e) {
    e.stopPropagation();

    if (this.config.functions.toggle_action) {
      return this.config.functions.toggle_action(this.state, this.entity,
        this.climate.entity, this.climate.mode);
    }

    return this.climate.callService('switch', 'toggle', { entity_id: this.entity.entity_id });
  }

  handleChange(e) {
    e.stopPropagation();

    const selected = e.detail.id;

    if (this.config.functions.change_action) {
      return this.config.functions.change_action(selected, this.state, this.entity,
        this.climate.entity, this.climate.mode);
    }

    return undefined;
  }
}
