import { getEntityValue, round } from '../utils/utils';
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

    if ('round' in this.config && Number.isNaN(value) === false)
      value = round(value, this.config.round);

    return value;
  }

  get unit() {
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
