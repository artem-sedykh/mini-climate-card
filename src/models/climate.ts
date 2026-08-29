import getLabel from '../utils/getLabel';
import ICON, { STATES_OFF, UNAVAILABLE_STATES } from '../const';
import type { CardConfig, HassEntity, HomeAssistant, SourceItem } from '../types';

/**
 * Where Home Assistant keeps the strings for a climate entity's state and its
 * attributes today.
 *
 * It used to keep them under `state.climate.*` and `state_attributes.climate.*`,
 * which is what this card asked for until #133. Measured on 2026.8.3: every one
 * of those keys answers an empty string now, in every language, so `getLabel`
 * fell through to its fallback and the card drew the raw id - `cool` where the
 * thermostat card draws `Cool`, and `cool` where a German dashboard expects
 * `Kuehlbetrieb`. On an English dashboard that reads as a lowercase letter
 * rather than as a missing translation, which is how it went unreported as a
 * bug for four years and was filed as a question.
 *
 * The old spellings stay at the end of each list: `getLabel` walks it in order,
 * so they cost one lookup on a current Home Assistant and still answer on an
 * installation old enough to have them.
 */
const ENTITY_COMPONENT = 'component.climate.entity_component._';

export default class ClimateObject {
  hass: HomeAssistant;

  config: CardConfig;

  entity: HassEntity;

  state: string;

  attr: Record<string, any>;

  /** The mode the card is showing, which `main` assigns after it reads it. */
  private _hvac_mode: SourceItem | undefined;

  /**
   * `entity` is optional because there is nothing to pass when `config.entity`
   * names an entity Home Assistant does not have (#46). Everything below
   * reads `this.entity`, which is an empty object in that case, rather than
   * the argument.
   */
  constructor(hass: HomeAssistant, config: CardConfig, entity?: HassEntity) {
    this.hass = hass || ({} as HomeAssistant);
    this.config = config || ({} as CardConfig);
    this.entity = entity || ({} as HassEntity);
    this.state = this.entity.state;
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
      ...(this.entity.attributes || {}),
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
    const labels = [
      `${ENTITY_COMPONENT}.state_attributes.hvac_action.state.${action}`,
      `state_attributes.climate.hvac_action.${action}`,
    ];
    item.name = getLabel(this.hass, labels, action);

    if (action in source) {
      if (typeof source[action] === 'string') item.name = source[action];
      else item = { ...item, ...source[action] };
    }

    return item;
  }

  get mode(): SourceItem | undefined {
    return this._hvac_mode;
  }

  set mode(value: SourceItem | undefined) {
    this._hvac_mode = value;
  }

  get defaultHvacModes(): SourceItem[] {
    const hvacModes = this.attr.hvac_modes;
    const source: SourceItem[] = [];

    for (let i = 0; i < hvacModes.length; i += 1) {
      const hvacMode = hvacModes[i];
      const labels = [
        `${ENTITY_COMPONENT}.state.${hvacMode}`,
        `state.climate.${hvacMode}`,
        `component.climate.state._.${hvacMode}`,
      ];
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

    for (let i = 0; i < fanModes.length; i += 1) {
      const mode = fanModes[i];
      const labels = [
        `${ENTITY_COMPONENT}.state_attributes.fan_mode.state.${mode}`,
        `state_attributes.climate.fan_mode.${mode}`,
      ];
      source[mode] = getLabel(this.hass, labels, mode);
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
    return this.isUnavailable === false && STATES_OFF.includes(this.state);
  }

  get isActive() {
    return (this.isOff === false && this.isUnavailable === false) || false;
  }

  get isUnavailable() {
    // The test was `this.entity === undefined`, which could never be true:
    // the constructor normalises a missing entity to an empty object, and an
    // empty object is not undefined. An entity that is not in `hass.states`
    // is recognised by having no `entity_id` (#46).
    return this.entity.entity_id === undefined || UNAVAILABLE_STATES.includes(this.state);
  }

  get isOn() {
    // Read through `isUnavailable` rather than through `this.entity`, or a
    // card pointed at an entity that does not exist reports itself on: this
    // is the default `active` for both dropdowns (`src/main.ts`).
    return this.isUnavailable === false && STATES_OFF.includes(this.state) === false;
  }

  callService(domain: string, service: string, inOptions?: Record<string, unknown>) {
    return this.hass.callService(domain, service, {
      entity_id: this.config.entity,
      ...inOptions,
    });
  }
}
