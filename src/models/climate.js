import getLabel from '../utils/getLabel';
import ICON, { STATES_OFF, UNAVAILABLE_STATES } from '../const';

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
      hvac_action: '',
      fan_modes: [],
      ...entity.attributes || {},
    };
  }

  get lastChanged() {
    return this.entity.last_changed;
  }

  get hvacAction() {
    const source = (this.config.secondary_info && this.config.secondary_info.source) || {};
    const action = this.attr.hvac_action;
    let item = { id: action };
    const labelPrefix = 'state_attributes.climate.hvac_action';
    item.name = getLabel(this.hass, [`${labelPrefix}.${action}`], action);

    if (action in source) {
      if (typeof source[action] === 'string')
        item.name = source[action];
      else
        item = { ...item, ...source[action] };
    }

    return item;
  }

  get mode() {
    return this._hvac_mode;
  }

  set mode(value) {
    this._hvac_mode = value;
  }

  get defaultHvacModes() {
    const hvacModes = this.attr.hvac_modes;
    const source = [];

    for (let i = 0; i < hvacModes.length; i += 1) {
      const hvacMode = hvacModes[i];
      const labels = [`state.climate.${hvacMode}`, `component.climate.state._.${hvacMode}`];
      const item = { id: hvacMode, name: getLabel(this.hass, labels, hvacMode) };
      const iconId = hvacMode.toString().toUpperCase();
      if (iconId in ICON)
        item.icon = ICON[iconId];

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

  callService(domain, service, inOptions) {
    return this.hass.callService(domain, service, {
      entity_id: this.config.entity,
      ...inOptions,
    });
  }
}
