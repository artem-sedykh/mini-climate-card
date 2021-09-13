import { getEntityValue } from '../utils/utils';

export default class TargetTemperatureObject {
  constructor(entity, config, hass) {
    this.entity = entity || {};
    this.config = config;
    this._hass = hass;

    this.min = this.getMin();
    this.max = this.getMax();
    this.step = this.getStep();
  }

  get hass() {
    return this._hass;
  }

  get icons() {
    return this.config.target_temperature.icons;
  }

  getStep() {
    if ('step' in this.config.target_temperature)
      return parseFloat(this.config.target_temperature.step);

    if (this.entity && this.entity.attributes && this.entity.attributes.target_temp_step)
      return parseFloat(this.entity.attributes.target_temp_step);

    return 1.0;
  }

  getMin() {
    if ('min' in this.config.target_temperature)
      return parseFloat(this.config.target_temperature.min);

    if (this.entity && this.entity.attributes && this.entity.attributes.min_temp)
      return parseFloat(this.entity.attributes.min_temp);

    return 16.0;
  }

  getMax() {
    if ('max' in this.config.target_temperature)
      return parseFloat(this.config.target_temperature.max);

    if (this.entity && this.entity.attributes && this.entity.attributes.max_temp)
      return parseFloat(this.entity.attributes.max_temp);

    return 30.0;
  }

  get value() {
    if (this._targetTemperature !== undefined)
      return parseFloat(this._targetTemperature);

    return parseFloat(getEntityValue(this.entity, this.config.target_temperature.source));
  }

  set value(value) {
    this._targetTemperature = parseFloat(value);
  }

  increment() {
    const oldValue = this.value;

    const newVal = this._round(this.value + this.step);

    if (newVal <= this.max) {
      if (newVal <= this.min) {
        this.value = this.min;
      } else {
        this.value = newVal;
      }
    } else {
      this.value = this.max;
    }

    return oldValue !== this.value;
  }

  decrement() {
    const oldValue = this.value;

    const newVal = this._round(this.value - this.step);

    if (newVal >= this.min) {
      this.value = newVal;
    } else {
      this.value = this.min;
    }

    return oldValue !== this.value;
  }

  _round(val) {
    const s = this.step.toString().split('.');
    return s[1] ? parseFloat(val.toFixed(s[1].length)) : Math.round(val);
  }

  update(value) {
    if (this.config.target_temperature.functions.change_action) {
      const climateEntity = this.hass[this.config.entity];
      return this.config.target_temperature.functions.change_action(value, this.entity,
        climateEntity);
    }

    return this.hass.callService('climate', 'set_temperature', { entity_id: this.entity.entity_id, temperature: value });
  }
}
