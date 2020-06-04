import getLabel from '../utils/getLabel';
import { STATES_OFF, UNAVAILABLE_STATES } from '../const';

export default class ClimateObject {
  constructor(hass, config, entity) {
    this.hass = hass || {};
    this.config = config || {};
    this.entity = entity || {};
    this.state = entity.state;
    this.attr = {
      friendly_name: '',
      temperature: 16,
      current_temperature: 24,
      fan_mode: '',
      hvac_modes: [],
      target_temp_step: undefined,
      min_temp: undefined,
      max_temp: undefined,
      fan_modes: [],
      ...entity.attributes || {},
    };

    this.hvac_modes = this.getHvacModes;
  }

  get mode() {
    return this.hvac_modes.find(s => s.id.toUpperCase() === this.state.toUpperCase());
  }

  get getHvacModes() {
    const hvacModes = this.attr.hvac_modes;
    const source = [];

    for (let i = 0; i < hvacModes.length; i += 1) {
      const hvacMode = hvacModes[i];
      let mode = {};

      if (this.config.hvac_mode && this.config.hvac_mode.source
        && this.config.hvac_mode.source[hvacMode]) {
        mode = this.config.hvac_mode.source[hvacMode];
      }

      const item = { ...mode || {} };

      item.id = hvacMode;
      if (!item.name) {
        const labels = [`state.climate.${item.id}`, `component.climate.state._.${item.id}`];
        item.name = getLabel(this.hass, labels, item.id);
      }

      source.push(item);
    }
    return source;
  }

  get defaultFanModes() {
    const fanModes = this.attr.fan_modes;
    const source = {};
    const labelPrefix = 'state_attributes.climate.fan_mode';

    for (let i = 0; i < fanModes.length; i += 1) {
      const mode = fanModes[i];
      source[mode] = getLabel(this.hass, [`${labelPrefix}.${mode}`], mode);
    }
    return source;
  }

  get id() {
    return this.entity.entity_id;
  }

  get icon() {
    return this.attr.icon;
  }

  get name() {
    return this.attr.friendly_name || '';
  }

  get isOff() {
    return this.entity !== undefined
      && STATES_OFF.includes(this.state)
      && !UNAVAILABLE_STATES.includes(this.state);
  }

  get isActive() {
    return (this.isOff === false && this.isUnavailable === false) || false;
  }

  get isUnavailable() {
    return this.entity === undefined || UNAVAILABLE_STATES.includes(this.state);
  }

  get isOn() {
    return this.entity !== undefined
      && !STATES_OFF.includes(this.state)
      && !UNAVAILABLE_STATES.includes(this.state);
  }

  setHvacMode(mode) {
    if (this.config.hvac_mode.functions.change_action)
      return this.config.hvac_mode.functions.change_action(mode, this.entity);

    return this.callService('climate', 'set_hvac_mode', { hvac_mode: mode });
  }

  callService(domain, service, inOptions) {
    return this.hass.callService(domain, service, {
      entity_id: this.config.entity,
      ...inOptions,
    });
  }
}
