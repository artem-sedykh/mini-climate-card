import { html, LitElement, css, type TemplateResult } from 'lit';
import define from '../utils/define';
import type { HomeAssistant, RawCardConfig } from '../types';

// ── Local schema types ─────────────────────────────────────────────────────

interface SchemaEntry {
  name: string;
  required?: boolean;
  selector?: Record<string, any>;
}

// ── Module-level pure constants & helpers ──────────────────────────────────

const BASIC_SCHEMA: SchemaEntry[] = [
  {
    name: 'entity',
    required: true,
    selector: { entity: { domain: ['climate', 'fan'] } },
  },
  { name: 'name', selector: { text: {} } },
  { name: 'icon', selector: { icon: {} } },
  { name: 'group', selector: { boolean: {} } },
  {
    name: 'scale',
    selector: {
      number: {
        min: 0.5,
        max: 3,
        step: 0.1,
        mode: 'box',
      },
    },
  },
  { name: 'swap_temperatures', selector: { boolean: {} } },
  { name: 'hide_current_temperature', selector: { boolean: {} } },
];

const TAP_ACTION_OPTIONS = [
  { value: 'more-info', label: 'More info (default)' },
  { value: 'navigate', label: 'Navigate' },
  { value: 'call-service', label: 'Call service' },
  { value: 'url', label: 'Open URL' },
  { value: 'fire-dom-event', label: 'Fire DOM event' },
  { value: 'none', label: 'None' },
];

function buildTapActionSchema(action: string | undefined): SchemaEntry[] {
  const schema: SchemaEntry[] = [
    { name: 'action', selector: { select: { options: TAP_ACTION_OPTIONS } } },
  ];
  if (action === 'navigate') {
    schema.push({ name: 'navigation_path', selector: { text: {} } });
  } else if (action === 'url') {
    schema.push({ name: 'url', selector: { text: {} } });
  } else if (action === 'more-info') {
    schema.push({ name: 'entity', selector: { entity: {} } });
  } else if (action === 'call-service') {
    schema.push({ name: 'service', selector: { action: {} } });
    schema.push({ name: 'service_data', selector: { object: {} } });
  }
  return schema;
}

const TOGGLE_SCHEMA: SchemaEntry[] = [
  { name: 'hide', selector: { boolean: {} } },
  { name: 'default', selector: { boolean: {} } },
  { name: 'icon', selector: { icon: {} } },
];

const SECONDARY_INFO_SCHEMA: SchemaEntry[] = [
  {
    name: 'type',
    selector: {
      select: {
        options: [
          { value: 'fan-mode', label: 'Fan mode' },
          { value: 'fan-mode-dropdown', label: 'Fan mode (dropdown)' },
          { value: 'hvac-mode', label: 'HVAC mode' },
          { value: 'hvac-action', label: 'HVAC action' },
          { value: 'last-changed', label: 'Last changed' },
          { value: 'last-updated', label: 'Last updated' },
        ],
      },
    },
  },
  { name: 'hide', selector: { boolean: {} } },
  { name: 'icon', selector: { icon: {} } },
];

const TEMPERATURE_SCHEMA: SchemaEntry[] = [
  { name: 'unit', selector: { select: { options: ['°C', '°F'], custom_value: true } } },
  {
    name: 'round',
    selector: {
      number: {
        min: 0,
        max: 5,
        step: 1,
        mode: 'box',
      },
    },
  },
];

const TARGET_TEMPERATURE_SCHEMA: SchemaEntry[] = [
  { name: 'unit', selector: { select: { options: ['°C', '°F'], custom_value: true } } },
  { name: 'min', selector: { number: { step: 0.5, mode: 'box' } } },
  { name: 'max', selector: { number: { step: 0.5, mode: 'box' } } },
  {
    name: 'step',
    selector: {
      number: {
        min: 0.1,
        max: 5,
        step: 0.1,
        mode: 'box',
      },
    },
  },
  { name: 'icon_up', selector: { icon: {} } },
  { name: 'icon_down', selector: { icon: {} } },
];

const HVAC_MODE_SCHEMA: SchemaEntry[] = [{ name: 'hide', selector: { boolean: {} } }];

const FAN_MODE_SCHEMA: SchemaEntry[] = [
  { name: 'icon', selector: { icon: {} } },
  { name: 'hide', selector: { boolean: {} } },
  {
    name: 'location',
    selector: {
      select: {
        options: [
          { value: 'bottom', label: 'Bottom panel' },
          { value: 'main', label: 'Main row' },
        ],
      },
    },
  },
];

const LABELS: Record<string, string> = {
  entity: 'Entity',
  name: 'Name (optional override)',
  icon: 'Icon',
  group: 'Group mode (remove card background)',
  scale: 'UI scale',
  swap_temperatures: 'Swap current and target temperature',
  hide_current_temperature: 'Hide current temperature',
  action: 'Action',
  navigation_path: 'Navigation path',
  url: 'URL',
  service: 'Service / Action',
  service_data: 'Service data',
  hide: 'Hide',
  default: 'Expanded by default',
  type: 'Type',
  unit: 'Unit',
  round: 'Decimal places (round)',
  min: 'Minimum temperature',
  max: 'Maximum temperature',
  step: 'Step',
  icon_up: 'Up icon',
  icon_down: 'Down icon',
  location: 'Button location',
};

const BASIC_KEYS: (keyof RawCardConfig)[] = [
  'entity',
  'name',
  'icon',
  'group',
  'scale',
  'swap_temperatures',
  'hide_current_temperature',
];

// ── Editor component ───────────────────────────────────────────────────────

export default class MiniClimateEditor extends LitElement {
  hass!: HomeAssistant;

  config!: RawCardConfig;

  // Bound once in the constructor to avoid allocating new function instances
  // on every render() call, which is a LitElement anti-pattern.
  private readonly _computeLabel: (schema: SchemaEntry) => string;

  private readonly _basicChanged: (e: Event) => void;

  private readonly _tapActionChanged: (e: Event) => void;

  private readonly _targetTempChanged: (e: Event) => void;

  private readonly _onSecondaryInfo: (e: Event) => void;

  private readonly _onToggle: (e: Event) => void;

  private readonly _onTemperature: (e: Event) => void;

  private readonly _onHvacMode: (e: Event) => void;

  private readonly _onFanMode: (e: Event) => void;

  static override get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
    };
  }

  static override get styles() {
    return css`
      :host {
        display: block;
      }
      ha-expansion-panel {
        display: block;
        margin-top: 4px;
        --expansion-panel-summary-padding: 0 16px;
        --expansion-panel-content-padding: 0 16px 8px;
      }
      ha-form {
        display: block;
      }
    `;
  }

  constructor() {
    super();
    this._computeLabel = schema => LABELS[schema.name] ?? schema.name;
    this._basicChanged = e => this._handleBasicChanged(e);
    this._tapActionChanged = e => this._handleTapActionChanged(e);
    this._targetTempChanged = e => this._handleTargetTempChanged(e);
    this._onSecondaryInfo = e => this._onSub('secondary_info', e);
    this._onToggle = e => this._onSub('toggle', e);
    this._onTemperature = e => this._onSub('temperature', e);
    this._onHvacMode = e => this._onSub('hvac_mode', e);
    this._onFanMode = e => this._onSub('fan_mode', e);
  }

  // ── Config normalisation ─────────────────────────────────────────────────

  setConfig(config: RawCardConfig): void {
    // Normalise secondary_info string shorthand → object so the form always
    // receives a plain object.
    let secondaryInfo = config.secondary_info;
    if (typeof secondaryInfo === 'string') {
      secondaryInfo = { type: secondaryInfo };
    }
    this.config = { ...config, secondary_info: secondaryInfo ?? {} };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private _fire(newConfig: RawCardConfig): void {
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: newConfig } }));
  }

  /** Shared handler for simple sub-object sections (no data transformation). */
  private _onSub(key: string, e: Event): void {
    if (!this.config || !this.hass) return;
    const value = (e as CustomEvent<{ value: Record<string, any> }>).detail.value;
    this._fire({ ...this.config, [key]: value });
  }

  /** Extract only the top-level scalar fields that belong to the basic form. */
  private _basicData(): Record<string, any> {
    const data: Record<string, any> = {};
    for (let i = 0; i < BASIC_KEYS.length; i += 1) {
      const k = BASIC_KEYS[i];
      if (this.config[k] !== undefined) {
        data[k] = this.config[k];
      }
    }
    return data;
  }

  /** Return the stored tap_action, defaulting action to 'more-info'. */
  private _tapActionData(): Record<string, any> {
    return { action: 'more-info', ...(this.config.tap_action as Record<string, any> | undefined) };
  }

  /**
   * Flatten target_temperature.icons.{up,down} into icon_up/icon_down so
   * ha-form can use them as top-level schema fields.
   */
  private _targetTempData(): Record<string, any> {
    const tt: Record<string, any> = this.config.target_temperature ?? {};
    const icons: Record<string, any> = tt.icons ?? {};
    const data: Record<string, any> = {};
    if (tt.unit !== undefined) data.unit = tt.unit;
    if (tt.min !== undefined) data.min = tt.min;
    if (tt.max !== undefined) data.max = tt.max;
    if (tt.step !== undefined) data.step = tt.step;
    if (icons.up !== undefined) data.icon_up = icons.up;
    if (icons.down !== undefined) data.icon_down = icons.down;
    return data;
  }

  private _subData(key: string): Record<string, any> {
    return (this.config[key] as Record<string, any>) ?? {};
  }

  // ── Event handlers ───────────────────────────────────────────────────────

  private _handleBasicChanged(e: Event): void {
    if (!this.config || !this.hass) return;
    const updated = (e as CustomEvent<{ value: Record<string, any> }>).detail.value;
    const newConfig = { ...this.config };
    for (let i = 0; i < BASIC_KEYS.length; i += 1) {
      const k = BASIC_KEYS[i] as string;
      if (updated[k] !== undefined && updated[k] !== '') {
        (newConfig as Record<string, any>)[k] = updated[k];
      } else {
        delete (newConfig as Record<string, any>)[k];
      }
    }
    this._fire(newConfig);
  }

  private _handleTapActionChanged(e: Event): void {
    if (!this.config || !this.hass) return;
    const incoming = (e as CustomEvent<{ value: Record<string, any> }>).detail.value;
    const action: string = incoming.action ?? 'more-info';

    // Build a clean object containing ONLY the action and whichever
    // conditional field belongs to it. This ensures switching away from an
    // action never leaves stale keys (service, service_data, …) in the config.
    const value: Record<string, any> = { action };

    if (action === 'navigate' && incoming.navigation_path) {
      value.navigation_path = incoming.navigation_path;
    } else if (action === 'url' && incoming.url) {
      value.url = incoming.url;
    } else if (action === 'more-info' && incoming.entity) {
      value.entity = incoming.entity;
    } else if (action === 'call-service') {
      if (incoming.service) {
        value.service = incoming.service;
      }
      if (incoming.service_data && Object.keys(incoming.service_data).length > 0) {
        value.service_data = incoming.service_data;
      }
    }

    this._fire({ ...this.config, tap_action: value });
  }

  private _handleTargetTempChanged(e: Event): void {
    if (!this.config || !this.hass) return;
    const flat = (e as CustomEvent<{ value: Record<string, any> }>).detail.value;
    const existing: Record<string, any> = this.config.target_temperature ?? {};

    // Merge new icon values into the existing icons sub-object.
    const icons: Record<string, any> = { ...(existing.icons as Record<string, any>) };
    if (flat.icon_up) {
      icons.up = flat.icon_up;
    } else {
      delete icons.up;
    }
    if (flat.icon_down) {
      icons.down = flat.icon_down;
    } else {
      delete icons.down;
    }

    const newTT: Record<string, any> = { ...existing };
    if (flat.unit !== undefined) {
      newTT.unit = flat.unit;
    } else {
      delete newTT.unit;
    }
    if (flat.min !== undefined) {
      newTT.min = flat.min;
    } else {
      delete newTT.min;
    }
    if (flat.max !== undefined) {
      newTT.max = flat.max;
    } else {
      delete newTT.max;
    }
    if (flat.step !== undefined) {
      newTT.step = flat.step;
    } else {
      delete newTT.step;
    }
    if (Object.keys(icons).length > 0) {
      newTT.icons = icons;
    } else {
      delete newTT.icons;
    }

    this._fire({ ...this.config, target_temperature: newTT });
  }

  // ── Render helpers ───────────────────────────────────────────────────────

  private _renderSection(
    title: string,
    schema: SchemaEntry[],
    data: Record<string, any>,
    handler: (e: Event) => void,
  ): TemplateResult {
    return html`
      <ha-expansion-panel .header=${title} outlined>
        <ha-form
          .hass=${this.hass}
          .data=${data}
          .schema=${schema}
          .computeLabel=${this._computeLabel}
          @value-changed=${handler}
        ></ha-form>
      </ha-expansion-panel>
    `;
  }

  override render(): TemplateResult {
    if (!this.hass || !this.config) return html``;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._basicData()}
        .schema=${BASIC_SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._basicChanged}
      ></ha-form>

      ${this._renderSection(
        'Tap action',
        buildTapActionSchema(this._tapActionData().action),
        this._tapActionData(),
        this._tapActionChanged,
      )}

      ${this._renderSection(
        'Secondary info',
        SECONDARY_INFO_SCHEMA,
        this._subData('secondary_info'),
        this._onSecondaryInfo,
      )}

      ${this._renderSection(
        'Toggle panel button',
        TOGGLE_SCHEMA,
        this._subData('toggle'),
        this._onToggle,
      )}

      ${this._renderSection(
        'Temperature display',
        TEMPERATURE_SCHEMA,
        this._subData('temperature'),
        this._onTemperature,
      )}

      ${this._renderSection(
        'Target temperature',
        TARGET_TEMPERATURE_SCHEMA,
        this._targetTempData(),
        this._targetTempChanged,
      )}

      ${this._renderSection('HVAC mode', HVAC_MODE_SCHEMA, this._subData('hvac_mode'), this._onHvacMode)}

      ${this._renderSection('Fan mode', FAN_MODE_SCHEMA, this._subData('fan_mode'), this._onFanMode)}
    `;
  }
}

define('mini-climate-editor', MiniClimateEditor);
