import { describe, expect, it, vi } from 'vitest';
import ClimateObject from '../../src/models/climate';

const hass = { localize: key => ({ 'state.climate.cool': 'Cooling' })[key] || '' };

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
      { id: 'cool', name: 'Cooling', icon: 'mdi:snowflake' },
      { id: 'heat', name: 'heat', icon: 'mdi:weather-sunny' },
    ]);
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
    expect(c.defaultFanModes).toEqual({ auto: 'auto', low: 'low' });
  });

  it('is empty when the entity reports no fan modes', () => {
    expect(climate('cool').defaultFanModes).toEqual({});
  });
});

describe('ClimateObject.hvacAction', () => {
  it('answers the raw action when nothing overrides it', () => {
    const c = climate('cool', { hvac_action: 'cooling' });
    expect(c.hvacAction).toEqual({ id: 'cooling', name: 'cooling' });
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
