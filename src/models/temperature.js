import { compileTemplate, getEntityValue, round } from '../utils/utils';

export default class TemperatureObject {
  constructor(temperatureEntity, targetTemperatureEntity, config, climate) {
    this.climate = climate || {};
    this.temperatureEntity = temperatureEntity || {};
    this.targetTemperatureEntity = targetTemperatureEntity || {};
    this.config = config;
    if (this.config.hide_current_temperature) {
      if (typeof this.config.hide_current_temperature === 'boolean') {
        this.shouldHideCurrentTemperature = () => true;
      } else {
        this.shouldHideCurrentTemperature = compileTemplate(this.config.hide_current_temperature);
      }
    } else {
      this.shouldHideCurrentTemperature = () => false;
    }
  }

  get unit() {
    return this.config.temperature.unit || this.config.target_temperature.unit;
  }

  get step() {
    const entity = this.targetTemperatureEntity;

    if ('step' in this.config.target_temperature)
      return this.config.target_temperature.step;

    if (entity && entity.attributes && entity.attributes.target_temp_step)
      return entity.attributes.target_temp_step;

    return 1;
  }

  get value() {
    const value = this.rawValue;

    if (value !== undefined) {
      if ('fixed' in this.config.temperature)
        return parseFloat(value.toString()).toFixed(this.config.temperature.fixed);

      if ('round' in this.config.temperature)
        return round(value, this.config.temperature.round);
    }

    return value;
  }

  get rawValue() {
    return getEntityValue(this.temperatureEntity, this.config.temperature.source);
  }

  get hide() {
    return this.shouldHideCurrentTemperature(this.value, this.temperatureEntity,
      this.targetTemperatureEntity, this.climate.entity, this.climate.mode);
  }
}
