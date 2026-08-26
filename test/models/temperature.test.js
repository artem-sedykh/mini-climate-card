import { describe, expect, it, vi } from 'vitest';
import TemperatureObject from '../../src/models/temperature';

const entity = (attributes = {}) => ({
  entity_id: 'climate.living_room',
  state: 'cool',
  attributes: { current_temperature: 21.456, temperature: 21, ...attributes },
});

const temperature = (config = {}, ent = entity(), climate = {}) =>
  new TemperatureObject(
    ent,
    ent,
    {
      temperature: { source: { attribute: 'current_temperature' }, ...(config.temperature || {}) },
      target_temperature: { ...(config.target_temperature || {}) },
      ...(config.hide_current_temperature !== undefined
        ? { hide_current_temperature: config.hide_current_temperature }
        : {}),
    },
    climate,
  );

describe('TemperatureObject.value', () => {
  it('reads the attribute the source names', () => {
    expect(temperature().rawValue).toBe(21.456);
  });

  it('rounds when the configuration asks for it', () => {
    expect(temperature({ temperature: { round: 1 } }).value).toBe(21.5);
  });

  it('fixes the decimals when asked, and answers a string, as toFixed does', () => {
    // Which is deliberate: `fixed: 1` exists to keep 21.0 from displaying as
    // 21, and a number cannot carry that.
    expect(temperature({ temperature: { fixed: 1 } }).value).toBe('21.5');
  });

  it('prefers fixed over round when both are configured', () => {
    expect(temperature({ temperature: { fixed: 2, round: 0 } }).value).toBe('21.46');
  });

  it('answers the raw value when neither is configured', () => {
    expect(temperature().value).toBe(21.456);
  });

  it('leaves a missing reading undefined rather than rounding it', () => {
    const t = temperature({}, entity({ current_temperature: undefined }));
    expect(t.value).toBeUndefined();
  });
});

describe('TemperatureObject.unit', () => {
  it('prefers the temperature unit', () => {
    const t = temperature({ temperature: { unit: 'K' }, target_temperature: { unit: 'F' } });
    expect(t.unit).toBe('K');
  });

  it('falls back to the target temperature unit', () => {
    expect(temperature({ target_temperature: { unit: 'F' } }).unit).toBe('F');
  });

  it('falls back to celsius', () => {
    expect(temperature().unit).toBe('°C');
  });
});

describe('TemperatureObject.step', () => {
  it('prefers the configured step', () => {
    expect(temperature({ target_temperature: { step: 0.5 } }).step).toBe(0.5);
  });

  it('falls back to what the entity reports', () => {
    expect(temperature({}, entity({ target_temp_step: 0.5 })).step).toBe(0.5);
  });

  it('falls back to one', () => {
    expect(temperature().step).toBe(1);
  });
});

describe('TemperatureObject.hide', () => {
  it('is false when nothing is configured', () => {
    expect(temperature().hide).toBe(false);
  });

  it('is true for the boolean form, without compiling anything', () => {
    expect(temperature({ hide_current_temperature: true }).hide).toBe(true);
  });

  it('compiles a template form and answers what it returns', () => {
    const t = temperature({ hide_current_temperature: '(value) => value > 20' });
    expect(t.hide).toBe(true);
  });

  it('hands the template the value, both entities, the climate entity and the mode', () => {
    const hide = vi.fn(() => false);
    const t = temperature();
    t.shouldHideCurrentTemperature = hide;
    t.climate = { entity: { entity_id: 'climate.a' }, mode: 'cool' };
    void t.hide;
    expect(hide).toHaveBeenCalledWith(
      21.456,
      t.temperatureEntity,
      t.targetTemperatureEntity,
      { entity_id: 'climate.a' },
      'cool',
    );
  });

  it('throws while building when the template does not parse', () => {
    // Deliberate: this happens inside setConfig, and a template that cannot
    // be compiled is the one mistake that takes the whole card down rather
    // than one option with it.
    expect(() => temperature({ hide_current_temperature: '(value) => {' })).toThrow(
      /COMPILE ERROR/,
    );
  });
});
