import { describe, expect, it, vi } from 'vitest';
import TargetTemperatureObject from '../../src/models/target-temperature';

const entity = (attributes = {}) => ({
  entity_id: 'climate.living_room',
  state: 'cool',
  attributes: { temperature: 21, ...attributes },
});

const target = (targetConfig = {}, ent = entity(), hass = {}) =>
  new TargetTemperatureObject(
    ent,
    {
      entity: 'climate.living_room',
      target_temperature: { source: { attribute: 'temperature' }, functions: {}, ...targetConfig },
    },
    hass,
  );

describe('TargetTemperatureObject bounds', () => {
  it('takes min, max and step from the entity when the card configures none', () => {
    const t = target({}, entity({ min_temp: 10, max_temp: 32, target_temp_step: 0.5 }));
    expect([t.min, t.max, t.step]).toEqual([10, 32, 0.5]);
  });

  it('lets the card override each of them', () => {
    const t = target(
      { min: 5, max: 40, step: 2 },
      entity({ min_temp: 10, max_temp: 32, target_temp_step: 0.5 }),
    );
    expect([t.min, t.max, t.step]).toEqual([5, 40, 2]);
  });

  it('falls back to 16, 30 and 1 when neither says', () => {
    const t = target();
    expect([t.min, t.max, t.step]).toEqual([16, 30, 1]);
  });

  it('parses the numbers, so a string from YAML still behaves as one', () => {
    const t = target({ min: '5', max: '40', step: '0.5' });
    expect([t.min, t.max, t.step]).toEqual([5, 40, 0.5]);
  });
});

describe('TargetTemperatureObject.value', () => {
  it('reads the attribute the source names', () => {
    expect(target().value).toBe(21);
  });

  it('answers the placeholder when the entity has no target temperature', () => {
    // A climate entity in a mode with no setpoint reports none, and the card
    // draws a dash rather than NaN.
    expect(target({}, entity({ temperature: null })).value).toBe('-');
  });

  it('remembers a value that was set on it', () => {
    // The card holds the value locally between a press and the device
    // catching up, so the number does not jump back while the command is in
    // flight.
    const t = target();
    t.value = 23.5;
    expect(t.value).toBe(23.5);
  });
});

describe('TargetTemperatureObject.increment', () => {
  it('moves up by one step and says the value changed', () => {
    const t = target({ step: 0.5 });
    expect(t.increment()).toBe(true);
    expect(t.value).toBe(21.5);
  });

  it('stops at the maximum', () => {
    const t = target({ max: 21.5, step: 1 });
    expect(t.increment()).toBe(true);
    expect(t.value).toBe(21.5);
  });

  it('says nothing changed once it is already at the maximum', () => {
    // Which is what stops the card sending a command that would change
    // nothing, every time the button is pressed.
    const t = target({ max: 21 });
    expect(t.increment()).toBe(false);
    expect(t.value).toBe(21);
  });

  it('refuses to move when there is no target temperature to move', () => {
    const t = target({}, entity({ temperature: null }));
    expect(t.increment()).toBe(false);
    expect(t.value).toBe('-');
  });

  it('keeps a fractional step from accumulating floating point noise', () => {
    // 21 + 0.1 is 21.099999999999998, and the card would display that.
    const t = target({ step: 0.1 });
    t.increment();
    expect(t.value).toBe(21.1);
  });
});

describe('TargetTemperatureObject.decrement', () => {
  it('moves down by one step', () => {
    const t = target({ step: 0.5 });
    expect(t.decrement()).toBe(true);
    expect(t.value).toBe(20.5);
  });

  it('stops at the minimum', () => {
    const t = target({ min: 20.5, step: 1 });
    expect(t.decrement()).toBe(true);
    expect(t.value).toBe(20.5);
  });

  it('says nothing changed once it is already at the minimum', () => {
    const t = target({ min: 21 });
    expect(t.decrement()).toBe(false);
  });

  it('refuses to move when there is no target temperature to move', () => {
    const t = target({}, entity({ temperature: null }));
    expect(t.decrement()).toBe(false);
  });
});

describe('TargetTemperatureObject.update', () => {
  it('calls climate.set_temperature for the entity it reads', () => {
    const callService = vi.fn(() => 'sent');
    const t = target({}, entity(), { callService });
    expect(t.update(22)).toBe('sent');
    expect(callService).toHaveBeenCalledWith('climate', 'set_temperature', {
      entity_id: 'climate.living_room',
      temperature: 22,
    });
  });

  it('calls the change template instead when one is configured', () => {
    // Which is the whole point of change_action: a device that wants a
    // different service, or MQTT, rather than climate.set_temperature.
    const change = vi.fn(() => 'custom');
    const climateEntity = { entity_id: 'climate.living_room' };
    const hass = { callService: vi.fn(), states: { 'climate.living_room': climateEntity } };
    const t = target({ functions: { change_action: change } }, entity(), hass);
    expect(t.update(22)).toBe('custom');
    expect(change).toHaveBeenCalledWith(22, t.entity, climateEntity);
    expect(hass.callService).not.toHaveBeenCalled();
  });
});

describe('TargetTemperatureObject.icons', () => {
  it('exposes the configured icons', () => {
    const t = target({ icons: { up: 'mdi:up', down: 'mdi:down' } });
    expect(t.icons).toEqual({ up: 'mdi:up', down: 'mdi:down' });
  });
});
