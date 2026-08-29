import { describe, expect, it, vi } from 'vitest';
import IndicatorObject from '../../src/models/indicator';

const entity = (state, attributes = {}) => ({ entity_id: 'sensor.power', state, attributes });

const indicator = (config = {}, ent = entity('21.456'), climate = {}) =>
  new IndicatorObject(ent, { functions: {}, ...config }, climate, {});

describe('IndicatorObject.value', () => {
  it('reads the entity state when no source names an attribute', () => {
    expect(indicator().value).toBe('21.456');
  });

  it('reads the named attribute instead', () => {
    const i = indicator({ source: { attribute: 'power' } }, entity('on', { power: 42 }));
    expect(i.value).toBe(42);
  });

  it('rounds when the configuration asks for it', () => {
    expect(indicator({ round: 1 }).value).toBe(21.5);
  });

  it('passes the value through a mapper, and rounds what the mapper answered', () => {
    // The order matters: a mapper that turns a raw reading into a number is
    // useless if rounding happened before it.
    const mapper = vi.fn(() => 3.14159);
    const i = indicator({ round: 2, functions: { mapper } });
    expect(i.value).toBe(3.14);
  });

  it('hands the mapper the value, the entity, the climate entity and the mode', () => {
    const mapper = vi.fn(() => 1);
    const climateEntity = { entity_id: 'climate.a' };
    const i = indicator({ functions: { mapper } }, entity('7'), {
      entity: climateEntity,
      mode: 'cool',
    });
    void i.value;
    expect(mapper).toHaveBeenCalledWith('7', i.entity, climateEntity, 'cool');
  });

  it('keeps the raw reading available beside the mapped one', () => {
    const i = indicator({ functions: { mapper: () => 'mapped' } });
    expect(i.value).toBe('mapped');
    expect(i.originalValue).toBe('21.456');
  });

  it('keeps the decimals asked for, trailing zero and all', () => {
    // #163: `round: 1` answers a number, so a reading that rounds to a whole
    // number loses the decimal point and a column of indicators jumps about.
    // `fixed` answers a string, which can carry the zero - the same option
    // `temperature` has had since v1.2.2.
    expect(indicator({ fixed: 1 }, entity('23.01')).value).toBe('23.0');
    expect(indicator({ fixed: 1 }, entity('23.74')).value).toBe('23.7');
    expect(indicator({ fixed: 1 }, entity('23')).value).toBe('23.0');
  });

  it('rounds the same reading to a bare number, which is the difference', () => {
    expect(indicator({ round: 1 }, entity('23.01')).value).toBe(23);
  });

  it('prefers fixed over round when both are written', () => {
    expect(indicator({ fixed: 2, round: 0 }).value).toBe('21.46');
  });

  it('rounds what the mapper answered, and fixes it too', () => {
    const mapper = value => Number(value) * 2;
    expect(indicator({ fixed: 1, functions: { mapper } }, entity('11.5')).value).toBe('23.0');
  });

  it('leaves a reading that is not a number exactly as it came', () => {
    // #298: the guard was `Number.isNaN(value) === false`, which does not
    // coerce, so every one of these reached `round()` and was drawn as `NaN`.
    for (const config of [{ round: 1 }, { fixed: 1 }]) {
      expect(indicator(config, entity('unavailable')).value).toBe('unavailable');
      expect(indicator(config, entity('unknown')).value).toBe('unknown');
      expect(indicator(config, entity('auto')).value).toBe('auto');
      expect(indicator(config, entity('21:47:08')).value).toBe('21:47:08');
      expect(indicator(config, entity('')).value).toBe('');
    }
  });

  it('leaves a missing attribute undefined rather than making it NaN', () => {
    const i = indicator({ round: 1, source: { attribute: 'nope' } }, entity('on'));
    expect(i.value).toBeUndefined();
  });

  it('is undefined for an attribute the entity does not have', () => {
    const i = indicator({ source: { attribute: 'missing' } }, entity('on', { power: 1 }));
    expect(i.value).toBeUndefined();
  });
});

describe('IndicatorObject icon', () => {
  it('answers a plain string icon', () => {
    expect(indicator({ icon: 'mdi:flash' }).icon).toBe('mdi:flash');
  });

  it('prefers an icon template over a plain icon', () => {
    const template = vi.fn(() => 'mdi:computed');
    const i = indicator({ icon: { template: 'x' }, functions: { icon: { template } } });
    expect(i.icon).toBe('mdi:computed');
  });

  it('answers an empty string when there is neither', () => {
    // Rather than undefined, which lit would render as the text "undefined".
    expect(indicator().icon).toBe('');
    expect(indicator({ icon: { style: {} } }).icon).toBe('');
  });

  it('hands an icon template the mapped value, not the raw one', () => {
    const template = vi.fn(() => 'mdi:x');
    const i = indicator({
      functions: { mapper: () => 'mapped', icon: { template } },
    });
    void i.icon;
    expect(template).toHaveBeenCalledWith('mapped', i.entity, undefined, undefined);
  });
});

describe('IndicatorObject styles', () => {
  it('answers what the style templates return', () => {
    const i = indicator({
      functions: {
        icon: { style: () => ({ color: 'red' }) },
        value: { style: () => ({ color: 'blue' }) },
      },
    });
    expect(i.iconStyle).toEqual({ color: 'red' });
    expect(i.valueStyle).toEqual({ color: 'blue' });
  });

  it('answers an empty object when a template answers nothing', () => {
    // styleMap throws on undefined, so this is what keeps a template that
    // forgot to return from taking the card down.
    const i = indicator({
      functions: { icon: { style: () => undefined }, value: { style: () => undefined } },
    });
    expect(i.iconStyle).toEqual({});
    expect(i.valueStyle).toEqual({});
  });

  it('answers an empty object when no template is configured', () => {
    expect(indicator().iconStyle).toEqual({});
    expect(indicator().valueStyle).toEqual({});
  });
});

describe('IndicatorObject.hide', () => {
  it('is false when no template is configured', () => {
    expect(indicator().hide).toBe(false);
  });

  it('answers what the template returns', () => {
    expect(indicator({ functions: { hide: () => true } }).hide).toBe(true);
  });

  it('hands the template the same four arguments as everything else', () => {
    const hide = vi.fn(() => false);
    const climateEntity = { entity_id: 'climate.a' };
    const i = indicator({ functions: { hide } }, entity('7'), {
      entity: climateEntity,
      mode: 'heat',
    });
    void i.hide;
    expect(hide).toHaveBeenCalledWith('7', i.entity, climateEntity, 'heat');
  });
});

describe('IndicatorObject identity', () => {
  it('carries the id and unit from the configuration', () => {
    const i = indicator({ id: 'power', unit: 'W' });
    expect(i.id).toBe('power');
    expect(i.unit).toBe('W');
  });
});

describe('IndicatorObject unit template', () => {
  it('hands a unit template the mapped value and the original one', () => {
    // The mapper divides 1500 W into 1.5; the unit template reads the raw
    // value to pick kW/W, and gets the mapped one as its first argument.
    const mapper = vi.fn(value => value / 1000);
    const unitTemplate = vi.fn((_mapped, value) => (value > 1000 ? 'kW' : 'W'));
    const i = indicator(
      {
        source: { attribute: 'power' },
        functions: { mapper, unit: { template: unitTemplate } },
      },
      entity('on', { power: 1500 }),
    );
    expect(i.value).toBe(1.5);
    expect(i.unit).toBe('kW');
    expect(unitTemplate).toHaveBeenCalledWith(1.5, 1500, i.entity, undefined, undefined);
  });

  it('keeps a plain string unit when there is no template', () => {
    expect(indicator({ unit: 'W' }).unit).toBe('W');
  });
});
