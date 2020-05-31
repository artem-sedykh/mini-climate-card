import getLabel from './utils/getLabel';

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

  get id() {
    return this.entity.entity_id;
  }

  get targetTemperature() {
    const config = { };

    if (this.config.target_temperature) {
      if ('min' in this.config.target_temperature)
        config.min = this.config.target_temperature.min;

      if ('max' in this.config.target_temperature)
        config.max = this.config.target_temperature.max;

      if ('step' in this.config.target_temperature)
        config.step = this.config.target_temperature.step;

      if ('unit' in this.config.target_temperature)
        config.unit = this.config.target_temperature.unit;
    }

    if (!('min' in config))
      config.min = this.attr.min_temp || 16;

    if (!('max' in config))
      config.max = this.attr.max_temp || 30;

    if (!('step' in config))
      config.step = this.attr.target_temp_step || 1;

    config.value = this.attr.temperature || 0;

    return config;
  }

  get name() {
    return this.attr.friendly_name || '';
  }

  get isOff() {
    return this.state === 'off';
  }

  get isActive() {
    return (this.isOff === false && this.isUnavailable === false) || false;
  }

  get isUnavailable() {
    return this.state === 'unavailable';
  }

  get isOn() {
    return this.isUnavailable === false && this.isOff === false;
  }

  setFanMode(value) {
    return this.callService('climate', 'set_fan_mode', { fan_mode: value });
  }

  setTargetTemperature(value) {
    return this.callService('climate', 'set_temperature', { temperature: value });
  }

  setHvacMode(mode) {
    return this.callService('climate', 'set_hvac_mode', { hvac_mode: mode });
  }

  callService(domain, service, inOptions) {
    return this.hass.callService(domain, service, {
      entity_id: this.config.entity,
      ...inOptions,
    });
  }
}
