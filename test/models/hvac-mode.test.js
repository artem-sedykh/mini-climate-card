import { describe, expect, it, vi } from 'vitest';
import HvacModeObject from '../../src/models/hvac-mode';

const entity = (state, attributes = {}) => ({
  entity_id: 'climate.living_room',
  state,
  attributes,
});

const hvacMode = (config = {}, ent = entity('cool'), climate = {}) =>
  new HvacModeObject(ent, { functions: {}, ...config }, climate);

// The hvac mode is a dropdown built the same way a button's is, but its
// templates are called with one argument fewer - no card mode, because this is
// what decides it. Everything below that looks like a duplicate of the button
// tests is pinning exactly that difference.

describe('HvacModeObject state', () => {
  it('reads the entity state when no attribute is named', () => {
    expect(hvacMode().state).toBe('cool');
  });

  it('reads the named attribute instead', () => {
    expect(hvacMode({ state: { attribute: 'mode' } }, entity('cool', { mode: 'heat' })).state).toBe(
      'heat',
    );
  });

  it('passes the state through a mapper, without the card mode', () => {
    const mapper = vi.fn(() => 'mapped');
    const climateEntity = { entity_id: 'climate.a' };
    const h = hvacMode({ functions: { state: { mapper } } }, entity('cool'), {
      entity: climateEntity,
      mode: 'cool',
    });
    expect(h.state).toBe('mapped');
    expect(mapper).toHaveBeenCalledWith('cool', h.entity, climateEntity);
    expect(h.originalState).toBe('cool');
  });
});

describe('HvacModeObject templates', () => {
  it('answers the defaults when none are configured', () => {
    const h = hvacMode();
    expect(h.hide).toBe(false);
    expect(h.disabled).toBe(false);
    expect(h.isActive('cool')).toBe(false);
    expect(h.style).toEqual({});
  });

  it('answers what each template returns', () => {
    const h = hvacMode({
      functions: {
        hide: () => true,
        disabled: () => true,
        active: () => true,
        style: () => ({ color: 'red' }),
      },
    });
    expect(h.hide).toBe(true);
    expect(h.disabled).toBe(true);
    expect(h.isActive('cool')).toBe(true);
    expect(h.style).toEqual({ color: 'red' });
  });

  it('answers an empty object when the style template returns nothing', () => {
    expect(hvacMode({ functions: { style: () => undefined } }).style).toEqual({});
  });

  it('calls the active template with the state it is given, not the current one', () => {
    // The card asks "would this option be active", once per option in the
    // menu, so the argument is the option and not the entity's state.
    const active = vi.fn(() => false);
    const h = hvacMode({ functions: { active } }, entity('cool'));
    h.isActive('heat');
    expect(active).toHaveBeenCalledWith('heat', h.entity, undefined);
  });
});

describe('HvacModeObject.source', () => {
  it('turns the configured map into a list, dropping __filter', () => {
    const h = hvacMode({
      source: { cool: 'Cool', heat: { name: 'Heat', icon: 'mdi:x' }, __filter: 'x' },
    });
    expect(h.source).toEqual([
      { id: 'cool', name: 'Cool' },
      { id: 'heat', name: 'Heat', icon: 'mdi:x' },
    ]);
  });

  it('sorts by order when any option carries one', () => {
    const h = hvacMode({ source: { a: { order: 2 }, b: { order: 1 } } });
    expect(h.source.map(s => s.id)).toEqual(['b', 'a']);
  });

  it('passes the list through a filter template, without the card mode', () => {
    const filter = vi.fn(source => source);
    const climateEntity = { entity_id: 'climate.a' };
    const h = hvacMode(
      { source: { cool: 'Cool' }, functions: { source: { filter } } },
      entity('cool'),
      {
        entity: climateEntity,
        mode: 'cool',
      },
    );
    void h.source;
    expect(filter).toHaveBeenCalledWith(
      [{ id: 'cool', name: 'Cool' }],
      'cool',
      h.entity,
      climateEntity,
    );
  });

  it('finds the selected option, comparing as a string', () => {
    expect(hvacMode({ source: { cool: 'Cool' } }).selected).toEqual({ id: 'cool', name: 'Cool' });
  });

  it('answers undefined when the state matches no option', () => {
    expect(hvacMode({ source: { heat: 'Heat' } }).selected).toBeUndefined();
  });
});

describe('HvacModeObject.handleChange', () => {
  it('calls the change template with the selection, the entity and the climate entity', () => {
    const change = vi.fn(() => 'changed');
    const climateEntity = { entity_id: 'climate.a' };
    const h = hvacMode({ functions: { change_action: change } }, entity('cool'), {
      entity: climateEntity,
    });
    expect(h.handleChange('heat')).toBe('changed');
    expect(change).toHaveBeenCalledWith('heat', h.entity, climateEntity);
  });

  it('does nothing when no template is configured', () => {
    expect(hvacMode().handleChange('heat')).toBeUndefined();
  });
});

describe('HvacModeObject.icon', () => {
  it('uses the built-in glyph for the current mode', () => {
    expect(hvacMode({ source: { cool: 'Cool' } }).icon).toBe('mdi:snowflake');
  });

  it('uses the selected source icon when one is set', () => {
    expect(hvacMode({ source: { cool: { name: 'Cool', icon: 'mdi:x' } } }).icon).toBe('mdi:x');
  });

  it('ignores an icon on the config, which is a default rather than a choice', () => {
    // `getButtonConfig` builds this section too, and it gives everything it
    // builds `icon: mdi:radiobox-marked`. Answering it here would draw that
    // one glyph whatever the mode is - which is what it did (#194). A fixed
    // glyph for the line is `secondary_info.icon`. Asserted from the
    // assembled configuration in `test/card-logic.test.js`; this pins the
    // model on its own.
    expect(hvacMode({ icon: 'mdi:radiobox-marked', source: { cool: 'Cool' } }).icon).toBe(
      'mdi:snowflake',
    );
  });

  it('falls back to the default climate icon when nothing matches', () => {
    expect(hvacMode({ source: { heat: 'Heat' } }).icon).toBe('mdi:air-conditioner');
  });
});

describe('HvacModeObject.actionTimeout', () => {
  it('defaults to two seconds', () => {
    expect(hvacMode().actionTimeout).toBe(2000);
  });

  it('reads action_timeout from the config', () => {
    expect(hvacMode({ action_timeout: 50 }).actionTimeout).toBe(50);
  });
});
