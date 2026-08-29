import { compileTemplate, getEntityValue, isNumeric, round } from '../utils/utils';
import type { CardConfig, HassEntity, Template } from '../types';
import type ClimateObject from './climate';

export default class TemperatureObject {
  climate: ClimateObject;

  temperatureEntity: HassEntity;

  targetTemperatureEntity: HassEntity;

  config: CardConfig;

  /** Compiled once in the constructor, because it is read on every render. */
  shouldHideCurrentTemperature: Template<boolean>;

  constructor(
    temperatureEntity: HassEntity,
    targetTemperatureEntity: HassEntity,
    config: CardConfig,
    climate: ClimateObject,
  ) {
    this.climate = climate || ({} as ClimateObject);
    this.temperatureEntity = temperatureEntity || ({} as HassEntity);
    this.targetTemperatureEntity = targetTemperatureEntity || ({} as HassEntity);
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
    return this.config.temperature.unit || this.config.target_temperature.unit || '°C';
  }

  get step() {
    const entity = this.targetTemperatureEntity;

    if ('step' in this.config.target_temperature) return this.config.target_temperature.step;

    if (entity && entity.attributes && entity.attributes.target_temp_step)
      return entity.attributes.target_temp_step;

    return 1;
  }

  get value() {
    const value = this.rawValue;

    // Not `value !== undefined`: `fixed` and `round` on a reading that is not
    // a number gave `NaN` here too (#298). Usually hidden, because a climate
    // entity that is unavailable makes the card draw its unavailable face -
    // but `temperature.source.entity` can point the reading at another entity,
    // and that one going offline leaves the rest of the card healthy.
    if (isNumeric(value)) {
      if ('fixed' in this.config.temperature)
        return parseFloat(value.toString()).toFixed(this.config.temperature.fixed);

      if ('round' in this.config.temperature) return round(value, this.config.temperature.round);
    }

    return value;
  }

  get rawValue() {
    return getEntityValue(this.temperatureEntity, this.config.temperature.source);
  }

  get hide() {
    return this.shouldHideCurrentTemperature(
      this.value,
      this.temperatureEntity,
      this.targetTemperatureEntity,
      this.climate.entity,
      this.climate.mode,
    );
  }
}
