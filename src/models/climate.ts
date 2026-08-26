import getLabel from '../utils/getLabel';
import ICON, { STATES_OFF, UNAVAILABLE_STATES } from '../const';
import type { CardConfig, HassEntity, HomeAssistant, SourceItem } from '../types';

export default class ClimateObject {
  hass: HomeAssistant;

  config: CardConfig;

  entity: HassEntity;

  state: string;

  attr: Record<string, any>;

  /** The mode the card is showing, which `main` assigns after it reads it. */
  private _hvac_mode: string | undefined;

  constructor(hass: HomeAssistant, config: CardConfig, entity: HassEntity) {
    this.hass = hass || ({} as HomeAssistant);
    this.config = config || ({} as CardConfig);
    this.entity = entity || ({} as HassEntity);
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
      ...(entity.attributes || {}),
    };
  }

  get lastChanged() {
    return this.entity.last_changed;
  }

  get lastUpdated() {
    return this.entity.last_updated;
  }

  get hvacAction(): SourceItem {
    const source = (this.config.secondary_info && this.config.secondary_info.source) || {};
    const action = this.attr.hvac_action;
    let item: SourceItem = { id: action };
    const labelPrefix = 'state_attributes.climate.hvac_action';
    item.name = getLabel(this.hass, [`${labelPrefix}.${action}`], action);

    if (action in source) {
      if (typeof source[action] === 'string') item.name = source[action];
      else item = { ...item, ...source[action] };
    }

    return item;
  }

  get mode(): string | undefined {
    return this._hvac_mode;
  }

  set mode(value: string | undefined) {
    this._hvac_mode = value;
  }

  get defaultHvacModes(): SourceItem[] {
    const hvacModes = this.attr.hvac_modes;
    const source: SourceItem[] = [];

    for (let i = 0; i < hvacModes.length; i += 1) {
      const hvacMode = hvacModes[i];
      const labels = [`state.climate.${hvacMode}`, `component.climate.state._.${hvacMode}`];
      const item: SourceItem = { id: hvacMode, name: getLabel(this.hass, labels, hvacMode) };
      const iconId = hvacMode.toString().toUpperCase();
      if (iconId in ICON) item.icon = ICON[iconId];

      source.push(item);
    }
    return source;
  }

  get defaultFanModes(): Record<string, string> {
    const fanModes = this.attr.fan_modes;
    const source: Record<string, string> = {};
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
    return (
      this.entity !== undefined &&
      STATES_OFF.includes(this.state) &&
      !UNAVAILABLE_STATES.includes(this.state)
    );
  }

  get isActive() {
    return (this.isOff === false && this.isUnavailable === false) || false;
  }

  get isUnavailable() {
    return this.entity === undefined || UNAVAILABLE_STATES.includes(this.state);
  }

  get isOn() {
    return (
      this.entity !== undefined &&
      !STATES_OFF.includes(this.state) &&
      !UNAVAILABLE_STATES.includes(this.state)
    );
  }

  callService(domain: string, service: string, inOptions?: Record<string, unknown>) {
    return this.hass.callService(domain, service, {
      entity_id: this.config.entity,
      ...inOptions,
    });
  }
}
