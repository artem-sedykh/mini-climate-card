import { describe, expect, it } from 'vitest';
import { compileTemplate, getEntityValue, isNumeric, round, toggleState } from '../src/utils/utils';

describe('round', () => {
  it('rounds to the given number of decimals', () => {
    expect(round(21.456, 1)).toBe(21.5);
    expect(round(21.444, 2)).toBe(21.44);
    expect(round(21.5, 0)).toBe(22);
  });

  it('rounds half away from zero rather than to even', () => {
    expect(round(0.5, 0)).toBe(1);
    expect(round(1.5, 0)).toBe(2);
    expect(round(2.5, 0)).toBe(3);
  });

  it('rounds the value a sensor would report as a string', () => {
    // Entity state is always a string, and this is where an indicator's
    // `round` option lands.
    expect(round('21.456', 1)).toBe(21.5);
  });

  it('answers NaN for something that is not a number', () => {
    expect(round('nonsense', 1)).toBeNaN();
  });
});

describe('toggleState', () => {
  it('answers the opposite of an on/off state', () => {
    expect(toggleState('on')).toBe('off');
    expect(toggleState('off')).toBe('on');
  });

  it('treats closed and locked as off, so they toggle to on', () => {
    expect(toggleState('closed')).toBe('on');
    expect(toggleState('locked')).toBe('on');
  });

  it('leaves an unavailable state alone', () => {
    // Toggling a state the card cannot act on would produce a command that
    // means nothing.
    expect(toggleState('unavailable')).toBe('unavailable');
    expect(toggleState('unknown')).toBe('unknown');
  });

  it('passes a falsy state straight through', () => {
    expect(toggleState(undefined)).toBeUndefined();
    expect(toggleState('')).toBe('');
  });

  it('answers off for any other state, because it is not one of the off ones', () => {
    expect(toggleState('cool')).toBe('off');
  });
});

describe('getEntityValue', () => {
  const entity = { state: 'cool', attributes: { temperature: 21, fan_mode: 'auto' } };

  it('answers the state when there is no source configuration', () => {
    expect(getEntityValue(entity)).toBe('cool');
    expect(getEntityValue(entity, {})).toBe('cool');
  });

  it('answers the named attribute when the source names one', () => {
    expect(getEntityValue(entity, { attribute: 'temperature' })).toBe(21);
  });

  it('answers undefined for an attribute the entity does not have', () => {
    // Which is what an option configured against the wrong integration looks
    // like: not an error, an empty control.
    expect(getEntityValue(entity, { attribute: 'humidity' })).toBeUndefined();
  });

  it('answers the state when the entity has no attributes at all', () => {
    expect(getEntityValue({ state: 'off' }, { attribute: 'temperature' })).toBe('off');
  });

  it('answers undefined when there is no entity', () => {
    // A control whose entity is missing from hass.states reaches here.
    expect(getEntityValue(undefined, { attribute: 'temperature' })).toBeUndefined();
  });
});

describe('isNumeric', () => {
  // What `Number.isNaN(value) === false` was standing in for. It let every
  // string through, because it does not coerce, and `round()` answered NaN
  // for all of them (#298).
  it('accepts a number, and a string that is one', () => {
    expect(isNumeric(0)).toBe(true);
    expect(isNumeric(-1.5)).toBe(true);
    expect(isNumeric('0')).toBe(true);
    expect(isNumeric('23.01')).toBe(true);
    expect(isNumeric(' 42 ')).toBe(true);
  });

  it('refuses the states a sensor actually takes', () => {
    expect(isNumeric('unavailable')).toBe(false);
    expect(isNumeric('unknown')).toBe(false);
    expect(isNumeric('auto')).toBe(false);
    expect(isNumeric('21:47:08')).toBe(false);
  });

  it('refuses a reading with its unit written into it', () => {
    // `Number('23 C')` is NaN, so this would have been left alone anyway.
    // Asserted because the alternative guard - `parseFloat` - would have
    // taken the 23 and silently dropped the rest.
    expect(isNumeric('23 C')).toBe(false);
  });

  it('refuses nothing-at-all, which Number() is happy to call zero', () => {
    expect(isNumeric('')).toBe(false);
    expect(isNumeric('   ')).toBe(false);
    expect(isNumeric(null)).toBe(false);
    expect(isNumeric(undefined)).toBe(false);
    expect(isNumeric(true)).toBe(false);
    expect(isNumeric(false)).toBe(false);
  });

  it('refuses a number that is not finite', () => {
    expect(isNumeric(NaN)).toBe(false);
    expect(isNumeric(Infinity)).toBe(false);
  });
});

describe('compileTemplate', () => {
  it('compiles a template string into a callable', () => {
    const fn = compileTemplate('(value) => value * 2');
    expect(fn(21)).toBe(42);
  });

  it('reaches an arrow template through `this`', () => {
    // This is the whole point of the context: whatever the user wrote beside
    // the template in YAML is readable from it.
    const fn = compileTemplate('() => this.unit', { unit: 'kWh' });
    expect(fn()).toBe('kWh');
  });

  it('does not reach a `function` template - the context binds the wrapper', () => {
    // Worth knowing before writing a template or documenting one.
    // compileTemplate calls the *wrapper* with `this` set to the context:
    //
    //   new Function('', 'return ' + template).call(context)
    //
    // An arrow captures that `this` when it is created, which is why the test
    // above works. A `function` expression gets its own `this` when it is
    // called, and the card calls it as a plain function - so the context is
    // not there, and reading anything off it silently gives undefined.
    const fn = compileTemplate('function () { return this.unit; }', { unit: 'kWh' });
    expect(fn()).toBeUndefined();
  });

  it('throws for a template that does not parse, and says what the source was', () => {
    // A template with a syntax error takes the whole card down, and the
    // message is the only thing a user ever sees - in the console, because
    // hui-error-card draws a red icon and drops the text.
    expect(() => compileTemplate('(value) => {')).toThrow(/COMPILE ERROR/);
    expect(() => compileTemplate('(value) => {')).toThrow(/SOURCE.*\(value\) => \{/s);
  });

  it('keeps the original error as the cause', () => {
    // Without this the SyntaxError and its stack were dropped and only the
    // message survived.
    let thrown;
    try {
      compileTemplate('(value) => {');
    } catch (error) {
      thrown = error;
    }
    expect(thrown.cause).toBeInstanceOf(SyntaxError);
  });

  it('does not catch a template that throws when it runs', () => {
    // Only compilation is guarded. A template that parses and then throws
    // does so inside a component's render, which is a different failure with
    // a different symptom - see the known debt in AGENTS.md.
    const fn = compileTemplate('() => { throw new Error("at runtime"); }');
    expect(() => fn()).toThrow('at runtime');
  });
});
