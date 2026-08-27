/**
 * @vitest-environment jsdom
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';

// The card element is imported for its side effect: main.js registers
// <mini-climate>. Nothing renders here - setConfig only reads and merges, so
// the Home Assistant elements the card draws are never needed.
let Card;

beforeAll(async () => {
  await import('../src/main');
  Card = customElements.get('mini-climate');
});

const climateEntity = (attributes = {}) => ({
  entity_id: 'climate.living_room',
  state: 'cool',
  attributes: {
    friendly_name: 'Living room',
    current_temperature: 21,
    temperature: 22,
    fan_mode: 'auto',
    fan_modes: ['auto', 'low'],
    hvac_modes: ['off', 'cool'],
    ...attributes,
  },
});

const build = (config, { callService = vi.fn(), entity = climateEntity() } = {}) => {
  const card = new Card();
  card.setConfig({ entity: 'climate.living_room', ...config });
  const hass = { states: { 'climate.living_room': entity }, localize: () => '', callService };
  card.hass = hass;
  return { card, hass, callService };
};

describe('setConfig validation', () => {
  it('accepts a climate entity', () => {
    expect(() => new Card().setConfig({ entity: 'climate.a' })).not.toThrow();
  });

  it('accepts a fan entity', () => {
    // Undocumented but supported, and worth keeping: someone's card depends
    // on it.
    expect(() => new Card().setConfig({ entity: 'fan.a' })).not.toThrow();
  });

  it('refuses an entity from any other domain', () => {
    expect(() => new Card().setConfig({ entity: 'sensor.a' })).toThrow(/climate, fan/);
  });

  it('refuses a configuration with no entity at all', () => {
    expect(() => new Card().setConfig({})).toThrow(/climate, fan/);
  });

  // Worth knowing when changing any of the above: the message never reaches
  // the dashboard. Measured on Home Assistant 2026.8.3 - hui-error-card draws
  // a red icon and drops the text, so a throw is a console message and
  // nothing more.
});

describe('the card defaults', () => {
  it('opens more-info when nothing says otherwise', () => {
    const { card } = build({});
    expect(card.config.tap_action).toEqual({
      action: 'more-info',
      navigation_path: '',
      url: '',
      entity: '',
      service: '',
      service_data: {},
    });
  });

  it('lets a tap_action object replace the whole default', () => {
    const { card } = build({ tap_action: { action: 'navigate', navigation_path: '/x' } });
    expect(card.config.tap_action).toEqual({ action: 'navigate', navigation_path: '/x' });
  });

  it('normalises a tap_action written as a string', () => {
    // The documented `tap_action: none`, and every other action written the
    // same way. Before #234 the string replaced the whole default object and
    // reached `handleClick`, which reads `.action` off it - so `none` worked
    // by accident and every other value was a dead click.
    expect(build({ tap_action: 'none' }).card.config.tap_action).toEqual({ action: 'none' });
    expect(build({ tap_action: 'more-info' }).card.config.tap_action).toEqual({
      action: 'more-info',
    });
  });

  it('reads swap_temperatures as a flag', () => {
    expect(build({}).card.swapTemperatures).toBe(false);
    expect(build({ swap_temperatures: true }).card.swapTemperatures).toBe(true);
  });
});

describe('hide_icon', () => {
  it('hides nothing when it is not configured', () => {
    expect(build({}).card.shouldHideIcon()).toBe(false);
  });

  it('takes a boolean', () => {
    expect(build({ hide_icon: true }).card.shouldHideIcon()).toBe(true);
    expect(build({ hide_icon: false }).card.shouldHideIcon()).toBe(false);
  });

  it('takes a template, like every other hide in this card', () => {
    // Compiled once in setConfig rather than per render, so what is stored is
    // the function and not the text.
    const { card } = build({ hide_icon: "(climate_entity) => climate_entity.state === 'off'" });

    expect(card.shouldHideIcon({ state: 'off' })).toBe(true);
    expect(card.shouldHideIcon({ state: 'cool' })).toBe(false);
  });
});

describe('indicators', () => {
  it('takes the id from the key it was written under', () => {
    const { card } = build({ indicators: { power: { source: { attribute: 'x' } } } });
    expect(card.config.indicators[0].id).toBe('power');
  });

  it('normalises a string tap_action into an object', () => {
    const { card } = build({ indicators: { power: { tap_action: 'more-info' } } });
    expect(card.config.indicators[0].tap_action).toEqual({ action: 'more-info' });
  });

  it('defaults an indicator to doing nothing when tapped', () => {
    const { card } = build({ indicators: { power: {} } });
    expect(card.config.indicators[0].tap_action).toEqual({ action: 'none' });
  });

  it('compiles a mapper into a callable', () => {
    const { card } = build({
      indicators: { power: { source: { mapper: '(value) => `${value} W`' } } },
    });
    expect(card.config.indicators[0].functions.mapper(42)).toBe('42 W');
  });

  it('compiles icon and value templates', () => {
    const { card } = build({
      indicators: {
        power: {
          icon: { template: '() => "mdi:flash"', style: '() => ({ color: "red" })' },
          value: { style: '() => ({ color: "blue" })' },
        },
      },
    });
    const { functions } = card.config.indicators[0];
    expect(functions.icon.template()).toBe('mdi:flash');
    expect(functions.icon.style()).toEqual({ color: 'red' });
    expect(functions.value.style()).toEqual({ color: 'blue' });
  });

  it('turns a boolean hide into a function rather than compiling it', () => {
    const { card } = build({ indicators: { power: { hide: true } } });
    expect(card.config.indicators[0].functions.hide()).toBe(true);
  });

  it('compiles a unit template', () => {
    const { card } = build({
      indicators: { power: { unit: { template: '(mapped, value) => value > 1000 ? "kW" : "W"' } } },
    });
    const { functions } = card.config.indicators[0];
    expect(functions.unit.template(1.5, 1500)).toBe('kW');
    expect(functions.unit.template(300, 300)).toBe('W');
  });

  it('keeps a key the card does not recognise, and hands it to the template', () => {
    // This is the extension point, not an oversight: the template context is
    // the option's own YAML, so anything written beside a template is
    // readable from it. Rejecting unknown keys would break it.
    const { card } = build({
      indicators: {
        power: { unit_price: 7, source: { mapper: '(value) => value * this.unit_price' } },
      },
    });
    expect(card.config.indicators[0].unit_price).toBe(7);
    expect(card.config.indicators[0].functions.mapper(6)).toBe(42);
  });

  it('builds an indicator object once hass arrives', () => {
    const { card } = build({
      indicators: { temp: { source: { attribute: 'current_temperature' } } },
    });
    expect(card.indicators.temp.value).toBe(21);
  });
});

describe('buttons', () => {
  it('numbers buttons by the order they were written in', () => {
    const { card } = build({ buttons: { a: {}, b: {} } });
    const byId = Object.fromEntries(card.config.buttons.map(b => [b.id, b.order]));
    expect(byId.a).toBe(1);
    expect(byId.b).toBe(2);
  });

  it('keeps an explicit order', () => {
    const { card } = build({ buttons: { a: { order: 9 } } });
    expect(card.config.buttons.find(b => b.id === 'a').order).toBe(9);
  });

  it('defaults a button to a button with a radio icon', () => {
    const { card } = build({ buttons: { a: {} } });
    const button = card.config.buttons.find(b => b.id === 'a');
    expect(button.type).toBe('button');
    expect(button.icon).toBe('mdi:radiobox-marked');
  });

  it('compiles the templates a button can carry', () => {
    const { card } = build({
      buttons: {
        a: {
          disabled: '() => true',
          active: '() => true',
          style: '() => ({ color: "red" })',
          toggle_action: '() => "toggled"',
          change_action: '() => "changed"',
          state: { mapper: '() => "mapped"' },
          source: { __filter: 'source => source' },
        },
      },
    });
    const { functions } = card.config.buttons.find(b => b.id === 'a');
    expect(functions.disabled()).toBe(true);
    expect(functions.active()).toBe(true);
    expect(functions.style()).toEqual({ color: 'red' });
    expect(functions.toggle_action()).toBe('toggled');
    expect(functions.change_action()).toBe('changed');
    expect(functions.state.mapper()).toBe('mapped');
    expect(functions.source.filter('x')).toBe('x');
  });

  it('gives a template access to call_service through `this`', () => {
    // Which is what makes a button able to do anything at all, and is why the
    // template context is built per option rather than shared.
    const { card, callService } = build({
      buttons: {
        a: { toggle_action: '() => this.call_service("mqtt", "publish", { topic: "t" })' },
      },
    });
    card.config.buttons.find(b => b.id === 'a').functions.toggle_action();
    expect(callService).toHaveBeenCalledWith('mqtt', 'publish', { topic: 't' });
  });

  it('gives a template access to toggle_state and to the whole configuration', () => {
    const { card } = build({
      name: 'Kitchen',
      buttons: {
        a: {
          toggle_action: '() => this.toggle_state("on")',
          change_action: '() => this.entity_config.name',
        },
      },
    });
    const { functions } = card.config.buttons.find(b => b.id === 'a');
    expect(functions.toggle_action()).toBe('off');
    expect(functions.change_action()).toBe('Kitchen');
  });
});

describe('the fan mode', () => {
  it('is a button like any other, under the id fan_mode', () => {
    const { card } = build({});
    const fanMode = card.config.buttons.find(b => b.id === 'fan_mode');
    expect(fanMode.type).toBe('dropdown');
    expect(fanMode.icon).toBe('mdi:fan');
    expect(fanMode.state).toEqual({ attribute: 'fan_mode' });
  });

  it('sets the fan mode through Home Assistant when nothing overrides it', () => {
    // This exercises the whole compile path rather than the default alone:
    // the built-in change_action is a function, and getButtonConfig puts it
    // through compileTemplate like any user's string - so its `this` is the
    // context object, and `this.call_service` is what reaches hass.
    const { card, callService } = build({});
    card.buttons.fan_mode.handleChange('low');
    expect(callService).toHaveBeenCalledWith('climate', 'set_fan_mode', {
      fan_mode: 'low',
      entity_id: 'climate.living_room',
    });
  });

  it('fills its options from the entity, but only once the card renders', () => {
    // Worth pinning, because it is the kind of thing that looks like a bug
    // from either side. The defaults cannot be built in setConfig - they come
    // from the entity's `fan_modes`, and setConfig runs before the card has a
    // hass - so they are filled in firstUpdated instead. A test that reads
    // them straight after setConfig sees an empty list.
    const { card } = build({});
    expect(card.buttons.fan_mode.source).toEqual([]);

    card.initDefaultFanModeSource();
    expect(card.buttons.fan_mode.source.map(s => s.id)).toEqual(['auto', 'low']);
  });

  it('leaves the options alone when the card configured its own', () => {
    const { card } = build({ fan_mode: { source: { turbo: 'Turbo' } } });
    card.initDefaultFanModeSource();
    expect(card.buttons.fan_mode.source.map(s => s.id)).toEqual(['turbo']);
  });

  it('is active exactly when the climate entity is on', () => {
    const { card } = build({});
    expect(card.buttons.fan_mode.isActive()).toBe(true);
    const off = build({}, { entity: { ...climateEntity(), state: 'off' } });
    expect(off.card.buttons.fan_mode.isActive()).toBe(false);
  });
});

describe('the hvac mode', () => {
  it('is a dropdown that sets the mode through Home Assistant', () => {
    const { card, callService } = build({});
    expect(card.config.hvac_mode.type).toBe('dropdown');
    card.hvacMode.handleChange('heat');
    expect(callService).toHaveBeenCalledWith('climate', 'set_hvac_mode', {
      hvac_mode: 'heat',
      entity_id: 'climate.living_room',
    });
  });

  it('fills its options from the entity, on first render for the same reason', () => {
    const { card } = build({});
    expect(card.config.hvac_mode.source).toBeUndefined();

    card.initDefaultHvacModeSource();
    expect(card.hvacMode.source.map(s => s.id)).toEqual(['off', 'cool']);
  });
});

describe('temperature and target temperature', () => {
  it('reads the current temperature attribute, rounded to one decimal', () => {
    const { card } = build({}, { entity: climateEntity({ current_temperature: 21.46 }) });
    expect(card.config.temperature.round).toBe(1);
    expect(card.temperature.value).toBe(21.5);
  });

  it('reads the target temperature attribute', () => {
    const { card } = build({});
    expect(card.config.target_temperature.source).toEqual({
      entity: undefined,
      attribute: 'temperature',
    });
    expect(card.targetTemperature.value).toBe(22);
  });

  it('defaults the up and down icons and lets each be replaced', () => {
    expect(build({}).card.config.target_temperature.icons).toEqual({
      up: 'mdi:chevron-up',
      down: 'mdi:chevron-down',
    });
    const { card } = build({ target_temperature: { icons: { up: 'mdi:plus' } } });
    expect(card.config.target_temperature.icons).toEqual({
      up: 'mdi:plus',
      down: 'mdi:chevron-down',
    });
  });

  it('compiles a target temperature change_action', () => {
    const { card, callService } = build({
      target_temperature: {
        change_action: '(value, entity) => this.call_service("mqtt", "publish", { value })',
      },
    });
    card.targetTemperature.update(23);
    expect(callService).toHaveBeenCalledWith('mqtt', 'publish', { value: 23 });
  });
});

describe('the toggle and secondary info', () => {
  it('defaults the toggle to hidden-until-needed, closed, with a dots icon', () => {
    const { card } = build({});
    expect(card.config.toggle.icon).toBe('mdi:dots-horizontal');
    expect(card.config.toggle.default).toBe(false);
    expect(card.toggle).toBe(false);
  });

  it('starts open when the configuration says so', () => {
    expect(build({ toggle: { default: true } }).card.toggle).toBe(true);
  });

  it('reads secondary_info written as a plain string', () => {
    const { card } = build({ secondary_info: 'hvac-mode' });
    expect(card.config.secondary_info.type).toBe('hvac-mode');
  });

  it('defaults secondary_info to the fan mode', () => {
    expect(build({}).card.config.secondary_info.type).toBe('fan_mode');
  });

  it('compiles a hide template for secondary info and for the toggle', () => {
    const { card } = build({
      secondary_info: { type: 'fan_mode', hide: '() => true' },
      toggle: { hide: '() => true' },
    });
    expect(card.config.secondary_info.functions.hide()).toBe(true);
    expect(card.config.toggle.functions.hide()).toBe(true);
  });
});
