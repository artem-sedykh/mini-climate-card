/**
 * @vitest-environment jsdom
 *
 * The contract in docs/functions.md, docs/tap-action.md and
 * docs/secondary-info.md, held to the code.
 *
 * Those pages tell a person - or the AI assistant they asked - what the card's
 * configuration language is, and every claim in them was checked against `src/`
 * once. This file is what keeps them checked: each test here is one sentence
 * from those pages, written the way a user writes it, as YAML text rather than
 * as a JavaScript function, because that is the only form the documentation can
 * show.
 *
 * jsdom for the same reason as config.test.js: `setConfig` only reads and
 * merges, and the element is never connected, so nothing renders.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';

let MiniClimate;

const climateEntity = (attributes = {}) => ({
  entity_id: 'climate.my_ac',
  state: 'cool',
  attributes: {
    friendly_name: 'Living room',
    current_temperature: 21,
    temperature: 22,
    fan_mode: 'auto',
    fan_modes: ['auto', 'low'],
    hvac_modes: ['off', 'cool'],
    turbo: true,
    turbo_al: true,
    swing_mode: 'horizontal',
    ...attributes,
  },
});

const card = (config, { entity = climateEntity(), states = {}, callService = vi.fn() } = {}) => {
  const element = new MiniClimate();
  element.setConfig({ entity: 'climate.my_ac', ...config });
  element.hass = {
    states: { 'climate.my_ac': entity, ...states },
    localize: () => '',
    callService,
  };
  return { element, callService };
};

const indicator = (element, id) => element.indicators[id];
const button = (element, id) => element.buttons[id];

beforeAll(async () => {
  await import('../src/main.ts');
  MiniClimate = customElements.get('mini-climate');
  expect(MiniClimate).toBeTypeOf('function');
});

describe('"this inside a function is the option\'s own YAML"', () => {
  it('reads a key written beside the function', () => {
    // The extension point: unknown keys inside a button are data, not
    // options, and the template indexes them as `this.<key>`.
    const { element } = card({
      buttons: {
        turbo: {
          topic: 'my_ac/turbo/set',
          toggle_action: '(state) => this.topic',
        },
      },
    });

    expect(button(element, 'turbo').handleToggle()).toBe('my_ac/turbo/set');
  });
});

describe('"call_service is on the controls that act"', () => {
  it('a button has it and an indicator does not', () => {
    const { element } = card({
      indicators: { reading: { source: { mapper: '() => typeof this.call_service' } } },
      buttons: { light: { disabled: '() => typeof this.call_service' } },
    });

    expect(indicator(element, 'reading').value).toBe('undefined');
    expect(button(element, 'light').disabled).toBe('function');
  });
});

describe('"this.toggle_state gives the opposite of the current state"', () => {
  it('turns on into off from a toggle_action', () => {
    const { element } = card(
      {
        buttons: {
          power: {
            state: { entity: 'switch.ac_power' },
            toggle_action: '(state) => this.toggle_state(state)',
          },
        },
      },
      {
        states: {
          'switch.ac_power': { entity_id: 'switch.ac_power', state: 'on', attributes: {} },
        },
      },
    );

    expect(button(element, 'power').handleToggle()).toBe('off');
  });
});

describe('"the switch.toggle service is the default when toggle_action is absent"', () => {
  it('toggles the button entity as a switch', () => {
    const { element, callService } = card(
      {
        buttons: {
          power: { state: { entity: 'switch.ac_power' } },
        },
      },
      {
        states: {
          'switch.ac_power': { entity_id: 'switch.ac_power', state: 'on', attributes: {} },
        },
      },
    );

    button(element, 'power').handleToggle();
    expect(callService).toHaveBeenCalledWith('switch', 'toggle', {
      entity_id: 'switch.ac_power',
    });
  });
});

describe('"source:__filter takes the list and returns a filtered one"', () => {
  it('drops the option the documented template names', () => {
    const { element } = card({
      buttons: {
        swing_mode: {
          type: 'dropdown',
          state: { attribute: 'swing_mode' },
          source: {
            off: 'Off',
            horizontal: 'On',
            vertical: 'Auto',
            __filter: 'source => source.filter(option => option.id !== "vertical")',
          },
        },
      },
    });

    expect(button(element, 'swing_mode').source.map(option => option.id)).toEqual([
      'off',
      'horizontal',
    ]);
  });
});

describe('"unit:template takes the mapped value, then the raw one"', () => {
  it('shows 1.5 kW for a sensor reporting 1500', () => {
    const { element } = card(
      {
        indicators: {
          power: {
            source: {
              entity: 'sensor.ac_power',
              mapper: 'value => value > 1000 ? value / 1000 : value',
            },
            unit: {
              template: "(mapped_value, value) => (value > 1000 ? 'kW' : 'W')",
            },
          },
        },
      },
      {
        states: {
          'sensor.ac_power': { entity_id: 'sensor.ac_power', state: '1500', attributes: {} },
        },
      },
    );

    const power = indicator(element, 'power');
    expect(power.value).toBe(1.5);
    expect(power.unit).toBe('kW');
  });
});

describe('"change_action receives selected, then state, then entity"', () => {
  it('the documented three-argument form reaches the entity the option reads', () => {
    // The form every example on the page uses. The second argument is the
    // button's state, not the entity: writing `entity.entity_id` against the
    // wrong slot is how a service call left with no entity at all (#194).
    const { element, callService } = card({
      buttons: {
        swing_mode: {
          type: 'dropdown',
          state: { attribute: 'swing_mode' },
          source: { off: 'Off', horizontal: 'On' },
          change_action:
            "(selected, state, entity) => this.call_service('climate', 'set_swing_mode', { entity_id: entity.entity_id, swing_mode: selected })",
        },
      },
    });

    button(element, 'swing_mode').handleChange('off');
    expect(callService).toHaveBeenCalledWith('climate', 'set_swing_mode', {
      entity_id: 'climate.my_ac',
      swing_mode: 'off',
    });
  });
});

describe('"every function gets the same four arguments"', () => {
  it('a hide template sees the current mode as the fourth', () => {
    const { element } = card({
      buttons: {
        turbo: {
          hide: '(state, entity, climate_entity, hvac_mode) => hvac_mode && hvac_mode.id',
        },
      },
    });

    element.initDefaultHvacModeSource();
    element.climate.mode = element.hvacMode.selected;

    expect(button(element, 'turbo').hide).toBe('cool');
  });
});

describe('"the card parses their text"', () => {
  it('refuses a template that does not parse', () => {
    expect(() =>
      card({
        indicators: { x: { source: { mapper: '(value) => { return value' } } },
      }),
    ).toThrow(/COMPILE ERROR/);
  });
});

describe('"an action that needs nothing but its name can be written as a bare string"', () => {
  it('the same shorthand works on the card, an indicator and both temperatures', () => {
    const { element } = card({
      tap_action: 'none',
      indicators: { humidity: { tap_action: 'more-info' } },
      temperature: { tap_action: 'more-info' },
      target_temperature: { tap_action: 'none' },
    });

    expect(element.config.tap_action).toEqual({ action: 'none' });
    expect(element.config.indicators[0].tap_action).toEqual({ action: 'more-info' });
    expect(element.config.temperature.tap_action).toEqual({ action: 'more-info' });
    expect(element.config.target_temperature.tap_action).toEqual({ action: 'none' });
  });
});

describe('"more-info opens the entity the reading comes from"', () => {
  it('a source entity, otherwise the climate entity', () => {
    const { element } = card({
      temperature: {
        source: { entity: 'sensor.living_room_temperature' },
        tap_action: 'more-info',
      },
    });

    expect(element.temperature.entityId).toBe('sensor.living_room_temperature');
    expect(element.temperature.targetEntityId).toBe('climate.my_ac');
  });
});

describe('"secondary_info hide receives the climate entity and the mode"', () => {
  it('hides the line when the documented template says so', () => {
    const { element } = card({
      secondary_info: {
        type: 'fan-mode',
        hide: '(climate_entity) => !climate_entity.attributes.turbo_al',
      },
    });

    expect(element.secondaryInfoHidden()).toBe(false);

    const hidden = card(
      {
        secondary_info: {
          type: 'fan-mode',
          hide: '(climate_entity) => !climate_entity.attributes.turbo_al',
        },
      },
      { entity: climateEntity({ turbo_al: false }) },
    );
    expect(hidden.element.secondaryInfoHidden()).toBe(true);
  });
});

describe('"a string on secondary_info is a type"', () => {
  it('last-changed, fan-mode and hvac-mode are types, not templates', () => {
    expect(card({ secondary_info: 'last-changed' }).element.config.secondary_info.type).toBe(
      'last-changed',
    );
    expect(card({ secondary_info: 'hvac-mode' }).element.config.secondary_info.type).toBe(
      'hvac-mode',
    );
    expect(card({ secondary_info: 'fan-mode-dropdown' }).element.config.secondary_info.type).toBe(
      'fan-mode-dropdown',
    );
  });
});
