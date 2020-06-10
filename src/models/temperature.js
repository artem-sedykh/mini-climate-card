import { getEntityValue, round } from '../utils/utils';

export default class TemperatureObject {
  constructor(temperatureEntity, targetTemperatureEntity, config) {
    this.temperatureEntity = temperatureEntity || {};
    this.targetTemperatureEntity = targetTemperatureEntity || {};
    this.config = config;
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
}
