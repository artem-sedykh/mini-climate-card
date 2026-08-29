import { describe, expect, it, vi } from 'vitest';
import ClimateObject from '../../src/models/climate';

// Today's keys, as a real Home Assistant answers them - measured on 2026.8.3,
// where every key this card used before #133 answers an empty string. The old
// spellings are exercised separately, by `legacyHass` below.
const TRANSLATIONS = {
  'component.climate.entity_component._.state.cool': 'Cool',
  'component.climate.entity_component._.state_attributes.fan_mode.state.auto': 'Auto',
  'component.climate.entity_component._.state_attributes.hvac_action.state.cooling': 'Cooling',
};

const hass = { localize: key => TRANSLATIONS[key] || '' };

// An installation old enough to still answer the keys the card asked for
// before #133, and nothing else. The card keeps them at the end of each list,
// so this one has to keep working.
const legacyHass = {
  localize: key =>
    ({
      'state.climate.cool': 'Kaelte',
      'state_attributes.climate.fan_mode.auto': 'Automatik',
      'state_attributes.climate.hvac_action.cooling': 'Kuehlt',
    })[key] || '',
};

const entity = (state, attributes = {}) => ({
  entity_id: 'climate.living_room',
  state,
  last_changed: '2026-08-26T06:00:00Z',
  last_updated: '2026-08-26T06:30:00Z',
  attributes,
});

const climate = (state, attributes, config = {}) =>
  new ClimateObject(hass, config, entity(state, attributes));

describe('ClimateObject state', () => {
  it('reads on, off, active and unavailable off the entity state', () => {
    const table = [
      ['cool', { isOn: true, isOff: false, isActive: true, isUnavailable: false }],
      ['off', { isOn: false, isOff: true, isActive: false, isUnavailable: false }],
      ['unavailable', { isOn: false, isOff: false, isActive: false, isUnavailable: true }],
      ['unknown', { isOn: false, isOff: false, isActive: false, isUnavailable: true }],
    ];

    for (const [state, expected] of table) {
      const c = climate(state);
      expect({
        isOn: c.isOn,
        isOff: c.isOff,
        isActive: c.isActive,
        isUnavailable: c.isUnavailable,
      }).toEqual(expected);
    }
  });

  it('is neither on nor off while unavailable', () => {
    // The distinction matters: a card that treated unavailable as off would
    // draw a working control for a device that cannot answer.
    const c = climate('unavailable');
    expect(c.isOn).toBe(false);
    expect(c.isOff).toBe(false);
  });

  it('exposes the entity id, name, icon and timestamps', () => {
    const c = climate('cool', { friendly_name: 'Living room', icon: 'mdi:snowflake' });
    expect(c.id).toBe('climate.living_room');
    expect(c.name).toBe('Living room');
    expect(c.icon).toBe('mdi:snowflake');
    expect(c.lastChanged).toBe('2026-08-26T06:00:00Z');
    expect(c.lastUpdated).toBe('2026-08-26T06:30:00Z');
  });

  it('answers an empty name rather than undefined when the entity has none', () => {
    expect(climate('cool').name).toBe('');
  });

  it('keeps the mode it is told about', () => {
    const c = climate('cool');
    c.mode = 'heat';
    expect(c.mode).toBe('heat');
  });
});

describe('ClimateObject.defaultHvacModes', () => {
  it('builds the dropdown from the entity, translating what it can', () => {
    const c = climate('cool', { hvac_modes: ['cool', 'heat'] });
    expect(c.defaultHvacModes).toEqual([
      { id: 'cool', name: 'Cool', icon: 'mdi:snowflake' },
      // Untranslated, and the fallback is the raw id: an entity can report a
      // mode Home Assistant has no string for.
      { id: 'heat', name: 'heat', icon: 'mdi:weather-sunny' },
    ]);
  });

  it('asks for the key a current Home Assistant answers, first', () => {
    // The whole of #133. The card asked only for `state.climate.<mode>` and
    // `component.climate.state._.<mode>`, and both were gone - so every mode
    // was drawn as its raw id, in every language.
    const asked = [];
    const spy = { localize: key => (asked.push(key), TRANSLATIONS[key] || '') };
    new ClimateObject(spy, {}, entity('cool', { hvac_modes: ['cool'] })).defaultHvacModes;

    expect(asked[0]).toBe('component.climate.entity_component._.state.cool');
  });

  it('still reads the old keys, for an installation that has them', () => {
    const c = new ClimateObject(legacyHass, {}, entity('cool', { hvac_modes: ['cool'] }));
    expect(c.defaultHvacModes[0].name).toBe('Kaelte');
  });

  it('leaves a mode the card has no icon for without one', () => {
    // Rather than substituting a default, which would look deliberate.
    const c = climate('cool', { hvac_modes: ['turbo'] });
    expect(c.defaultHvacModes).toEqual([{ id: 'turbo', name: 'turbo' }]);
  });

  it('is empty when the entity reports no modes', () => {
    expect(climate('cool').defaultHvacModes).toEqual([]);
  });
});

describe('ClimateObject.defaultFanModes', () => {
  it('maps each mode the entity reports to a label', () => {
    const c = climate('cool', { fan_modes: ['auto', 'low'] });
    // `low` has no string here, and falls back to the id it came as.
    expect(c.defaultFanModes).toEqual({ auto: 'Auto', low: 'low' });
  });

  it('still reads the old key, for an installation that has it', () => {
    const c = new ClimateObject(legacyHass, {}, entity('cool', { fan_modes: ['auto'] }));
    expect(c.defaultFanModes).toEqual({ auto: 'Automatik' });
  });

  it('is empty when the entity reports no fan modes', () => {
    expect(climate('cool').defaultFanModes).toEqual({});
  });
});

describe('ClimateObject.hvacAction', () => {
  it('translates the action when Home Assistant has a string for it', () => {
    const c = climate('cool', { hvac_action: 'cooling' });
    expect(c.hvacAction).toEqual({ id: 'cooling', name: 'Cooling' });
  });

  it('answers the raw action when nothing has a string for it', () => {
    const c = climate('cool', { hvac_action: 'defrosting' });
    expect(c.hvacAction).toEqual({ id: 'defrosting', name: 'defrosting' });
  });

  it('still reads the old key, for an installation that has it', () => {
    const c = new ClimateObject(legacyHass, {}, entity('cool', { hvac_action: 'cooling' }));
    expect(c.hvacAction).toEqual({ id: 'cooling', name: 'Kuehlt' });
  });

  it('takes a string override from secondary_info.source as the name', () => {
    const config = { secondary_info: { source: { cooling: 'Chilling' } } };
    const c = climate('cool', { hvac_action: 'cooling' }, config);
    expect(c.hvacAction).toEqual({ id: 'cooling', name: 'Chilling' });
  });

  it('merges an object override, so an icon can be added', () => {
    const config = { secondary_info: { source: { cooling: { name: 'Chilling', icon: 'mdi:x' } } } };
    const c = climate('cool', { hvac_action: 'cooling' }, config);
    expect(c.hvacAction).toEqual({ id: 'cooling', name: 'Chilling', icon: 'mdi:x' });
  });
});

describe('ClimateObject.callService', () => {
  it('sends the configured entity, not the entity object it was built from', () => {
    // The two differ when a control is configured against another entity, and
    // this is the one that decides what the command reaches.
    const callService = vi.fn();
    const c = new ClimateObject(
      { ...hass, callService },
      { entity: 'climate.configured' },
      entity('cool'),
    );
    c.callService('climate', 'set_hvac_mode', { hvac_mode: 'heat' });
    expect(callService).toHaveBeenCalledWith('climate', 'set_hvac_mode', {
      entity_id: 'climate.configured',
      hvac_mode: 'heat',
    });
  });

  it('lets the caller override the entity id', () => {
    const callService = vi.fn();
    const c = new ClimateObject({ ...hass, callService }, { entity: 'climate.a' }, entity('cool'));
    c.callService('switch', 'toggle', { entity_id: 'switch.b' });
    expect(callService).toHaveBeenCalledWith('switch', 'toggle', { entity_id: 'switch.b' });
  });
});

describe('ClimateObject built without an entity', () => {
  // What Home Assistant hands the card when `config.entity` names an entity
  // that is not in `hass.states`: renamed, deleted, or dropped by an
  // integration that removes entities rather than marking them unavailable
  // (#46).
  const missing = () => new ClimateObject(hass, {}, undefined);

  it('is unavailable, and neither on nor off', () => {
    const c = missing();
    expect(c.isUnavailable).toBe(true);
    expect(c.isOn).toBe(false);
    expect(c.isOff).toBe(false);
    expect(c.isActive).toBe(false);
  });

  it('answers for the entity rather than throwing', () => {
    const c = missing();
    expect(c.id).toBeUndefined();
    expect(c.state).toBeUndefined();
    expect(c.name).toBe('');
    expect(c.lastChanged).toBeUndefined();
    expect(c.lastUpdated).toBeUndefined();
  });

  it('still carries the attribute defaults the components read', () => {
    // The components render from these; the card only stops before them
    // because `isUnavailable` is true, and a default that is missing rather
    // than empty is one exception away from being visible again.
    const c = missing();
    expect(c.defaultHvacModes).toEqual([]);
    expect(c.defaultFanModes).toEqual({});
    expect(c.hvacAction).toEqual({ id: '', name: '' });
  });
});
