// A `hass` object with the four things the card touches: `states`, `localize`,
// `callService` and `language`.
//
// Service calls are recorded rather than sent. Counting them is the point of
// more than one test here: a mode picked once has to reach the device once,
// and a count settles that where a reading of the code does not.

export const ENTITY_ID = 'climate.bedroom';

export const FAN_MODES = ['auto', 'low', 'medium', 'high'];
export const HVAC_MODES = ['off', 'heat', 'cool', 'auto'];

// Home Assistant's own translations. The card asks for state labels and for
// the unavailable label; `hass.localize` returns an empty string for anything
// it does not know, and `getLabel` falls back when it does.
const TRANSLATIONS = {
  'state.default.unavailable': 'Unavailable',
  'state.climate.heat': 'Heat',
  'state.climate.cool': 'Cool',
  'state.climate.auto': 'Auto',
  'state.climate.off': 'Off',
  'state_attributes.climate.fan_mode.auto': 'Auto',
  'state_attributes.climate.fan_mode.low': 'Low',
  'state_attributes.climate.fan_mode.medium': 'Medium',
  'state_attributes.climate.fan_mode.high': 'High',
};

export const createHass = ({ state = 'heat', attributes = {} } = {}) => {
  const calls = [];
  const stamp = new Date('2026-01-01T00:00:00Z').toISOString();

  // Deliberately later than `last_changed`. Home Assistant stamps
  // `last_changed` when the state changes and `last_updated` when anything
  // does, so the two are equal only until the first attribute-only update.
  // Code that compares one kind of stamp against the other looks right for
  // exactly as long as a fixture keeps them equal.
  const updated = new Date('2026-01-01T00:00:30Z').toISOString();

  const entity = {
    entity_id: ENTITY_ID,
    state,
    last_changed: stamp,
    last_updated: updated,
    attributes: {
      friendly_name: 'Bedroom air conditioner',
      current_temperature: 24,
      temperature: 22,
      min_temp: 16,
      max_temp: 30,
      target_temp_step: 0.5,
      fan_mode: 'auto',
      fan_modes: FAN_MODES,
      hvac_modes: HVAC_MODES,
      hvac_action: 'heating',
      ...attributes,
    },
  };

  const sensor = (id, value, unit) => [
    `sensor.bedroom_${id}`,
    {
      entity_id: `sensor.bedroom_${id}`,
      state: value,
      last_changed: stamp,
      last_updated: updated,
      attributes: { unit_of_measurement: unit },
    },
  ];

  return {
    calls,
    language: 'en',
    localize: key => TRANSLATIONS[key] || '',
    callService: (domain, service, options) => {
      calls.push({ domain, service, options });
      return Promise.resolve();
    },
    states: Object.fromEntries([
      [ENTITY_ID, entity],
      sensor('humidity', '45', '%'),
      sensor('power', '850', 'W'),
      [
        'switch.bedroom_plug',
        {
          entity_id: 'switch.bedroom_plug',
          state: 'off',
          last_changed: stamp,
          last_updated: stamp,
          attributes: {},
        },
      ],
    ]),
  };
};
