// The shapes this card works with, as far as they are actually knowable.
//
// Two of them are not ours to tighten: `hass` belongs to Home Assistant, and a
// configuration object starts life as the user's YAML. What is written down
// here is what the card reads - anything narrower would be a claim this
// repository is not in a position to make.
//
// Part of the migration in #228, which is file by file rather than at once.

/** One entity, as Home Assistant reports it in `hass.states`. */
export interface HassEntity {
  entity_id: string;
  state: string;
  last_changed: string;
  last_updated: string;
  /** Whatever the integration sends. Templates read these by name. */
  attributes: Record<string, any>;
}

/** The four things the card uses out of the `hass` object it is handed. */
export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language?: string;
  localize: (key: string) => string;
  callService: (
    domain: string,
    service: string,
    data?: Record<string, unknown>,
  ) => Promise<unknown> | void;
}

/**
 * A function compiled by `compileTemplate` out of a string the user wrote.
 *
 * Each call site passes what that particular option is about - a value, the
 * entity it came from, the climate entity, the current mode - and reads
 * whatever comes back, so both ends are deliberately loose. The one rule that
 * is not loose is in `compileTemplate`: the user's text has to evaluate to an
 * **arrow** function, because `this` is the context and only an arrow captures
 * it.
 */
export type Template<Result = any> = (...args: any[]) => Result;

/** Where a reading comes from: an entity of its own, or an attribute of one. */
export interface Source {
  entity?: string;
  attribute?: string;
}

/** One option of a dropdown: `id` goes to the device, `name` is read by a user. */
export interface SourceItem {
  id: string;
  name?: string;
  icon?: string;
  order?: number;
  hide?: boolean;
  type?: string;
}

/** What a tap does, from the Lovelace vocabulary the card supports. */
export interface TapAction {
  action?: string;
  entity?: string;
  navigation_path?: string;
  service?: string;
  service_data?: Record<string, unknown>;
  url?: string;
}

/**
 * The compiled half of a configuration entry.
 *
 * `setConfig` puts every template the user wrote through `compileTemplate` and
 * files the results here, so a model never sees a string where it expects
 * behaviour. Everything is optional: an option nobody configured has no
 * function.
 */
export interface ConfigFunctions {
  hide?: Template<boolean>;
  disabled?: Template<boolean>;
  active?: Template<boolean>;
  style?: Template<Record<string, string>>;
  state?: { mapper?: Template };
  source?: { filter?: Template<SourceItem[]> };
  mapper?: Template;
  icon?: { template?: Template<string>; style?: Template<Record<string, string>> };
  value?: { style?: Template<Record<string, string>> };
  change_action?: Template;
  toggle_action?: Template;
  unit?: { template?: Template<string> };
}

export interface IndicatorConfig {
  id: string;
  source: Source;
  icon?: string | { template?: string; style?: string };
  unit?: string;
  round?: number;
  // Not optional: `getIndicatorConfig` normalises a missing one to
  // `{ action: 'none' }`, so by the time an indicator model sees it there is
  // always one.
  tap_action: TapAction;
  functions: ConfigFunctions;
}

export interface ButtonConfig {
  id: string;
  type?: string;
  icon?: string;
  order?: number;
  location?: string;
  state?: Source;
  source?: Record<string, any>;
  action_timeout?: number;
  functions: ConfigFunctions;
}

export interface HvacModeConfig {
  hide?: boolean;
  state?: Source;
  source?: Record<string, any>;
  functions: ConfigFunctions;
}

export interface TemperatureConfig {
  unit?: string;
  round?: number;
  fixed?: number;
  source?: Source;
}

export interface TargetTemperatureConfig {
  unit?: string;
  // Numbers as far as the card is concerned, but they arrive from YAML, where
  // `min: "16"` is as valid as `min: 16` - which is why the model parses them
  // rather than reading them.
  min?: number | string;
  max?: number | string;
  step?: number | string;
  source?: Source;
  icons: { up: string; down: string };
  functions: ConfigFunctions;
}

/**
 * The configuration as the user writes it in their Lovelace YAML.
 *
 * Everything is optional except the entity, everything a template can be is a
 * string, and a key the card does not recognise is not a mistake - the
 * templates read their own YAML back through `entity_config`, so an unknown
 * key is data. That is why this ends in an index signature and why narrowing
 * it further would be wrong rather than merely strict.
 */
export interface RawCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  scale?: number;
  collapse?: boolean;
  group?: boolean;
  swap_temperatures?: boolean;
  hide_icon?: boolean | string;
  tap_action?: TapAction | string;
  secondary_info?: string | Record<string, any>;
  toggle?: Record<string, any>;
  indicators?: Record<string, any>;
  buttons?: Record<string, any>;
  fan_mode?: Record<string, any>;
  hvac_mode?: Record<string, any>;
  temperature?: Record<string, any>;
  target_temperature?: Record<string, any>;
  [key: string]: any;
}

/**
 * What a template is called with as its `this`.
 *
 * `compileTemplate` evaluates the user's text and calls the wrapper with this
 * object bound, so a template body reads `this.call_service(...)` and
 * `this.entity_config`. The card builds one of these per option out of that
 * option's own YAML.
 */
export interface TemplateContext {
  call_service: (domain: string, service: string, options?: Record<string, unknown>) => unknown;
  entity_config?: RawCardConfig;
  toggle_state?: (state: string) => string;
  [key: string]: any;
}

/**
 * The configuration as the models read it - after `setConfig` has merged the
 * defaults in and compiled every template. The type of what the *user* writes
 * is a separate thing, and belongs with `main.ts` when it follows (#228).
 */
export interface CardConfig {
  entity: string;
  name?: string;
  temperature: TemperatureConfig;
  target_temperature: TargetTemperatureConfig;
  hvac_mode: HvacModeConfig;
  indicators: IndicatorConfig[];
  buttons: ButtonConfig[];
  secondary_info: Record<string, any>;
  toggle: Record<string, any>;
  /**
   * An object by the time the card reads it, whichever way it was written:
   * `setConfig` turns the documented string form (`tap_action: none`) into
   * `{ action: 'none' }`, the way `getIndicatorConfig` has always done for
   * indicators. Before #234 the two spellings behaved differently.
   */
  tap_action: TapAction;
  hide_current_temperature?: boolean | string;
  hide_icon?: boolean | string;
  [key: string]: any;
}
