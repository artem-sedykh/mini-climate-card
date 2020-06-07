import { getEntityValue, round } from '../utils/utils';

export default class IndicatorObject {
  constructor(entity, config, climate, hass) {
    this.config = config || {};
    this.entity = entity || {};
    this.climate = climate || {};
    this._hass = hass || {};
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
      value = this.config.functions.mapper(value, this.entity,
        this.climate.entity, this.climate.mode);
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
      return this.config.functions.icon.template(this.value, this.entity,
        this.climate.entity, this.climate.mode);
    } else if (this.config.icon && typeof this.config.icon === 'string') {
      return this.config.icon;
    }

    return '';
  }

  get iconStyle() {
    if (this.config.functions.icon && this.config.functions.icon.style)
      return this.config.functions.icon.style(this.value, this.entity,
        this.climate.entity, this.climate.mode) || {};

    return {};
  }
}
