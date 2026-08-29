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

  it('leaves a reading that is not a number exactly as it came', () => {
    // #298. Rarely seen through the climate entity itself, since an
    // unavailable one makes the card draw its unavailable face - but
    // `temperature.source.entity` can point this at another entity.
    for (const config of [{ round: 1 }, { fixed: 1 }]) {
      const t = temperature(
        { temperature: config },
        entity({ current_temperature: 'unavailable' }),
      );
      expect(t.value).toBe('unavailable');
    }
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

describe('TemperatureObject, what a tap acts on (#65)', () => {
  // The card resolves both of these in `updateTemperature` the same way, and
  // the component asks the model rather than repeating the fallback.
  const tapped = (config = {}, climate = {}) =>
    new TemperatureObject(
      entity(),
      entity(),
      {
        entity: 'climate.living_room',
        temperature: { tap_action: { action: 'none' }, ...(config.temperature || {}) },
        target_temperature: {
          tap_action: { action: 'none' },
          ...(config.target_temperature || {}),
        },
      },
      climate,
    );

  it('answers the climate entity when no source names one', () => {
    expect(tapped().entityId).toBe('climate.living_room');
    expect(tapped().targetEntityId).toBe('climate.living_room');
  });

  it('answers the source entity when there is one', () => {
    const t = tapped({
      temperature: { source: { entity: 'sensor.outside' } },
      target_temperature: { source: { entity: 'number.setpoint' } },
    });
    expect(t.entityId).toBe('sensor.outside');
    expect(t.targetEntityId).toBe('number.setpoint');
  });

  it('answers the source entity even when Home Assistant does not have it', () => {
    // Reading it off the resolved entity would answer the climate entity
    // here, and open a dialog for something the card is not showing.
    const t = tapped({ temperature: { source: { entity: 'sensor.gone' } } });
    t.temperatureEntity = {};
    expect(t.entityId).toBe('sensor.gone');
  });

  it('hands each action through as configured', () => {
    const t = tapped({
      temperature: { tap_action: { action: 'more-info' } },
      target_temperature: { tap_action: { action: 'url', url: 'https://example.com' } },
    });
    expect(t.tapAction).toEqual({ action: 'more-info' });
    expect(t.targetTapAction).toEqual({ action: 'url', url: 'https://example.com' });
  });

  it('takes hass from the climate, which is where the card put it', () => {
    const hass = { callService: vi.fn() };
    expect(tapped({}, { hass }).hass).toBe(hass);
  });
});
