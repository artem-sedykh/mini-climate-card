import { getEntityValue, isNumeric, round } from '../utils/utils';
import type { HassEntity, HomeAssistant, IndicatorConfig } from '../types';
import type ClimateObject from './climate';

export default class IndicatorObject {
  config: IndicatorConfig;

  entity: HassEntity;

  climate: ClimateObject;

  private _hass: HomeAssistant;

  constructor(
    entity: HassEntity,
    config: IndicatorConfig,
    climate: ClimateObject,
    hass: HomeAssistant,
  ) {
    this.config = config || ({} as IndicatorConfig);
    this.entity = entity || ({} as HassEntity);
    this.climate = climate || ({} as ClimateObject);
    this._hass = hass || ({} as HomeAssistant);
  }

  get id() {
    return this.config.id;
  }

  get hass() {
    return this._hass;
  }

  get originalValue() {
    return getEntityValue(this.entity, this.config.source);
  }

  get value() {
    let value = this.originalValue;

    if (this.config.functions.mapper) {
      value = this.config.functions.mapper(
        value,
        this.entity,
        this.climate.entity,
        this.climate.mode,
      );
    }

    // `fixed` before `round`, and both only for a reading that is a number -
    // the order and the guard are `TemperatureObject.value`, which has had
    // `fixed` since v1.2.2 (#163). The guard used to be
    // `Number.isNaN(value) === false`, which does not coerce, so `unavailable`
    // reached `round()` and was drawn as `NaN` (#298).
    if (isNumeric(value)) {
      if ('fixed' in this.config) value = parseFloat(value.toString()).toFixed(this.config.fixed);
      else if ('round' in this.config) value = round(value, this.config.round);
    }

    return value;
  }

  get unit() {
    if (this.config.functions.unit && this.config.functions.unit.template) {
      return this.config.functions.unit.template(
        this.value,
        this.originalValue,
        this.entity,
        this.climate.entity,
        this.climate.mode,
      );
    }

    return this.config.unit;
  }

  get icon() {
    if (this.config.functions.icon && this.config.functions.icon.template) {
      return this.config.functions.icon.template(
        this.value,
        this.entity,
        this.climate.entity,
        this.climate.mode,
      );
    } else if (this.config.icon && typeof this.config.icon === 'string') {
      return this.config.icon;
    }

    return '';
  }

  get iconStyle() {
    if (this.config.functions.icon && this.config.functions.icon.style)
      return (
        this.config.functions.icon.style(
          this.value,
          this.entity,
          this.climate.entity,
          this.climate.mode,
        ) || {}
      );

    return {};
  }

  get valueStyle() {
    if (this.config.functions.value && this.config.functions.value.style)
      return (
        this.config.functions.value.style(
          this.value,
          this.entity,
          this.climate.entity,
          this.climate.mode,
        ) || {}
      );

    return {};
  }

  get hide() {
    if (this.config.functions.hide) {
      return this.config.functions.hide(
        this.value,
        this.entity,
        this.climate.entity,
        this.climate.mode,
      );
    }

    return false;
  }
}
