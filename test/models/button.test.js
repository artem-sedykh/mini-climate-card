import { describe, expect, it, vi } from 'vitest';
import ButtonObject from '../../src/models/button';

const entity = (state, attributes = {}) => ({ entity_id: 'switch.turbo', state, attributes });

const button = (config = {}, ent = entity('on'), climate = {}) =>
  new ButtonObject(ent, { functions: {}, ...config }, climate, {});

describe('ButtonObject defaults', () => {
  it('sits at the bottom unless the configuration says otherwise', () => {
    expect(button().location).toBe('bottom');
    expect(button({ location: 'main' }).location).toBe('main');
  });

  it('uses the shared action timeout unless one is configured', () => {
    expect(button().actionTimeout).toBe(2000);
    expect(button({ action_timeout: 50 }).actionTimeout).toBe(50);
  });

  it('reports itself as visible and enabled when no template says otherwise', () => {
    const b = button();
    expect(b.hide).toBe(false);
    expect(b.disabled).toBe(false);
    expect(b.isActive('on')).toBe(false);
    expect(b.style).toEqual({});
  });
});

describe('ButtonObject state', () => {
  it('reads the entity state when the configuration names no attribute', () => {
    expect(button().state).toBe('on');
  });

  it('reads the named attribute instead', () => {
    const b = button({ state: { attribute: 'speed' } }, entity('on', { speed: 'high' }));
    expect(b.state).toBe('high');
  });

  it('passes the state through a mapper when one is configured', () => {
    const mapper = vi.fn(() => 'mapped');
    const b = button({ functions: { state: { mapper } } });
    expect(b.state).toBe('mapped');
    expect(b.originalState).toBe('on');
  });

  it('hands a template the state, the entity, the climate entity and the mode', () => {
    // The argument order is the contract every template in every user's
    // configuration is written against.
    const mapper = vi.fn(() => 'x');
    const climateEntity = { entity_id: 'climate.a' };
    const b = button({ functions: { state: { mapper } } }, entity('on'), {
      entity: climateEntity,
      mode: 'cool',
    });
    void b.state;
    expect(mapper).toHaveBeenCalledWith('on', b.entity, climateEntity, 'cool');
  });

  it('prefers an icon template over a plain icon, and hands it the same arguments', () => {
    const template = vi.fn(() => 'mdi:power-sleep');
    const climateEntity = { entity_id: 'climate.a' };
    const b = button({ functions: { icon: { template } } }, entity('on'), {
      entity: climateEntity,
      mode: 'cool',
    });
    expect(b.icon).toBe('mdi:power-sleep');
    expect(template).toHaveBeenCalledWith('on', b.entity, climateEntity, 'cool');
  });

  it('keeps a plain string icon, and returns nothing when there is no icon', () => {
    expect(button({ icon: 'mdi:fan' }).icon).toBe('mdi:fan');
    expect(button().icon).toBeUndefined();
  });

  it('is unavailable for an unavailable or unknown state', () => {
    expect(button({}, entity('unavailable')).isUnavailable).toBe(true);
    expect(button({}, entity('unknown')).isUnavailable).toBe(true);
    expect(button({}, entity('off')).isUnavailable).toBe(false);
  });

  it('is on for anything that is not an off state or an unavailable one', () => {
    expect(button({}, entity('on')).isOn).toBe(true);
    expect(button({}, entity('high')).isOn).toBe(true);
    expect(button({}, entity('off')).isOn).toBe(false);
    expect(button({}, entity('unavailable')).isOn).toBe(false);
  });
});

describe('ButtonObject.source', () => {
  it('turns the configured map into a list of options', () => {
    const b = button({ source: { low: 'Low', high: 'High' } });
    expect(b.source).toEqual([
      { id: 'low', name: 'Low' },
      { id: 'high', name: 'High' },
    ]);
  });

  it('keeps the extra keys of an object option', () => {
    const b = button({ source: { low: { name: 'Low', icon: 'mdi:fan' } } });
    expect(b.source).toEqual([{ id: 'low', name: 'Low', icon: 'mdi:fan' }]);
  });

  it('drops __filter, which is the template rather than an option', () => {
    const b = button({ source: { low: 'Low', __filter: '() => []' } });
    expect(b.source.map(s => s.id)).toEqual(['low']);
  });

  it('sorts by order when any option carries one', () => {
    const b = button({ source: { a: { name: 'A', order: 2 }, b: { name: 'B', order: 1 } } });
    expect(b.source.map(s => s.id)).toEqual(['b', 'a']);
  });

  it('keeps the written order when none of them does', () => {
    const b = button({ source: { z: 'Z', a: 'A' } });
    expect(b.source.map(s => s.id)).toEqual(['z', 'a']);
  });

  it('passes the list through a filter template when one is configured', () => {
    const filter = vi.fn(source => source.filter(s => s.id !== 'low'));
    const b = button({ source: { low: 'Low', high: 'High' }, functions: { source: { filter } } });
    expect(b.source.map(s => s.id)).toEqual(['high']);
  });

  it('is empty when nothing is configured', () => {
    expect(button().source).toEqual([]);
  });
});

describe('ButtonObject.selected', () => {
  it('finds the option matching the current state', () => {
    const b = button({ source: { on: 'On', off: 'Off' } }, entity('on'));
    expect(b.selected).toEqual({ id: 'on', name: 'On' });
  });

  it('compares as a string, so a numeric state still matches its option', () => {
    const b = button(
      { source: { 1: 'One' }, state: { attribute: 'level' } },
      entity('on', { level: 1 }),
    );
    expect(b.selected).toEqual({ id: '1', name: 'One' });
  });

  it('answers undefined when the state is not one of the options', () => {
    const b = button({ source: { on: 'On' } }, entity('turbo'));
    expect(b.selected).toBeUndefined();
  });

  it('answers undefined for a state that is missing entirely', () => {
    const b = button({ source: { on: 'On' }, state: { attribute: 'nope' } }, { attributes: {} });
    expect(b.selected).toBeUndefined();
  });
});

describe('ButtonObject actions', () => {
  it('calls the toggle template when one is configured', () => {
    const toggle = vi.fn(() => 'called');
    const b = button({ functions: { toggle_action: toggle } });
    expect(b.handleToggle()).toBe('called');
  });

  it('falls back to toggling the entity as a switch', () => {
    // Which is what a button with no toggle_action is: a switch toggle
    // through the climate object, so the service call carries its entity.
    const callService = vi.fn(() => 'sent');
    const b = button({}, entity('on'), { callService });
    expect(b.handleToggle()).toBe('sent');
    expect(callService).toHaveBeenCalledWith('switch', 'toggle', { entity_id: 'switch.turbo' });
  });

  it('calls the change template with the selection first', () => {
    const change = vi.fn(() => 'changed');
    const climateEntity = { entity_id: 'climate.a' };
    const b = button({ functions: { change_action: change } }, entity('on'), {
      entity: climateEntity,
      mode: 'cool',
    });
    expect(b.handleChange('high')).toBe('changed');
    expect(change).toHaveBeenCalledWith('high', 'on', b.entity, climateEntity, 'cool');
  });

  it('does nothing on change when no template is configured', () => {
    // A dropdown with no change_action is inert rather than guessing a
    // service to call.
    expect(button().handleChange('high')).toBeUndefined();
  });
});
