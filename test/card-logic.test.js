/**
 * @vitest-environment jsdom
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';

// The half of `main.ts` that decides rather than draws: the classes and styles
// a render is handed, what the name resolves to, what a press does, and the
// two sources that are filled after the first update rather than in
// `setConfig`.
//
// None of it needs a rendered card - these are called with the models the
// `hass` setter builds, and they answer plain objects, strings and events. The
// render methods themselves stay in `test/browser/`, where the Home Assistant
// elements they name exist.
let Card;

beforeAll(async () => {
  await import('../src/main');
  Card = customElements.get('mini-climate');
});

const climateEntity = (attributes = {}, state = 'cool') => ({
  entity_id: 'climate.living_room',
  state,
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

const build = (config, { entity = climateEntity(), callService = vi.fn() } = {}) => {
  const card = new Card();
  card.setConfig({ entity: 'climate.living_room', ...config });
  card.hass = { states: { 'climate.living_room': entity }, localize: () => '', callService };
  return { card, callService };
};

// `classMap` and the styles are handed to lit as directives; the object inside
// is what the assertions are about.
const classes = card => card.computeClasses().values[0];

describe('the name the card shows', () => {
  it('prefers the configured name', () => {
    expect(build({ name: 'Bedroom AC' }).card.name).toBe('Bedroom AC');
  });

  it('falls back to the entity friendly name', () => {
    expect(build({}).card.name).toBe('Living room');
  });
});

describe('secondaryInfoHidden', () => {
  it('is false for a card that says nothing about it', () => {
    expect(build({}).card.secondaryInfoHidden()).toBe(false);
  });

  it('is true while the entity is unavailable, whatever the configuration says', () => {
    // The line has nothing to say about an entity that cannot answer, and the
    // classes follow it: `--no-secondary-info` is what centres the name that
    // is then alone in its row (#100).
    const { card } = build({}, { entity: climateEntity({}, 'unavailable') });
    expect(card.secondaryInfoHidden()).toBe(true);
    expect(classes(card)['--no-secondary-info']).toBe(true);
  });

  it('follows the hide template, and hands it the entity and the mode', () => {
    const { card } = build({
      secondary_info: { type: 'fan_mode', hide: '(entity) => entity.state === "cool"' },
    });
    expect(card.secondaryInfoHidden()).toBe(true);
  });
});

describe('computeClasses', () => {
  it('marks a card that opens more-info, and one that does not', () => {
    expect(classes(build({}).card)['--more-info']).toBe(true);
    expect(classes(build({ tap_action: 'none' }).card)['--more-info']).toBe(false);
  });

  it('carries group, and follows the entity for active and unavailable', () => {
    const { card } = build({ group: true });
    const cls = classes(card);
    expect(cls['--group']).toBe(true);
    expect(cls['--inactive']).toBe(false);
    expect(cls['--unavailable']).toBe(false);

    const off = build({}, { entity: climateEntity({}, 'off') });
    expect(classes(off.card)['--inactive']).toBe(true);

    const gone = build({}, { entity: climateEntity({}, 'unavailable') });
    expect(classes(gone.card)['--unavailable']).toBe(true);
  });
});

describe('computeStyles and computeIconStyle', () => {
  it('turns scale into the unit everything on the card is measured in', () => {
    expect(build({ scale: 2 }).card.computeStyles()).toEqual({ '--mc-unit': '80px' });
  });

  it('answers an empty object when there is no scale', () => {
    // A plain object, not an applied `styleMap` - handing a DirectiveResult to
    // `styleMap` throws nothing and applies nothing (#297).
    expect(build({}).card.computeStyles()).toEqual({});
  });

  it('answers what the icon style template returns', () => {
    const { card } = build({
      icon: { template: "() => 'mdi:fire'", style: '(entity) => ({ color: entity.state })' },
    });
    expect(card.computeIconStyle()).toEqual({ color: 'cool' });
  });

  it('answers an empty object when the template returns nothing, and when there is none', () => {
    expect(build({ icon: { style: '() => undefined' } }).card.computeIconStyle()).toEqual({});
    expect(build({}).card.computeIconStyle()).toEqual({});
  });
});

describe('the toggle', () => {
  it('flips on a press and reports the class the button carries', () => {
    const { card } = build({});
    const event = { stopPropagation: vi.fn() };

    expect(card.toggleButtonCls()).toBe('');
    card.handleToggle(event);
    expect(card.toggle).toBe(true);
    expect(card.toggleButtonCls()).toBe('open');

    card.handleToggle(event);
    expect(card.toggle).toBe(false);
    // Stopped both times: the press is on a button inside the row the card's
    // own `tap_action` sits on.
    expect(event.stopPropagation).toHaveBeenCalledTimes(2);
  });
});

describe('a press on the name', () => {
  const listen = card => {
    const seen = [];
    card.addEventListener('hass-more-info', event => seen.push(event.detail));
    return seen;
  };

  it('opens more-info for the entity the card shows', () => {
    const { card } = build({});
    const seen = listen(card);

    card.handlePopup({ stopPropagation: vi.fn() }, true);
    expect(seen).toEqual([{ entityId: 'climate.living_room' }]);
  });

  it('does nothing when the caller says not to handle it', () => {
    // Which is what the card does when the secondary info line is a dropdown:
    // the press belongs to that control, not to more-info.
    const { card } = build({});
    const seen = listen(card);
    const event = { stopPropagation: vi.fn() };

    card.handlePopup(event, false);
    expect(seen).toHaveLength(0);
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });

  it('honours tap_action: none', () => {
    const { card } = build({ tap_action: 'none' });
    const seen = listen(card);

    card.handlePopup({ stopPropagation: vi.fn() }, true);
    expect(seen).toHaveLength(0);
  });
});

describe('the target temperature while it is being changed', () => {
  it('takes the value from the model and remembers that it is changing', () => {
    const { card } = build({});

    card.handleChangingTargetTemperature({ detail: { changing: true } });
    expect(card.targetTemperatureChanging).toBe(true);
    expect(card.targetTemperatureValue).toBe(22);

    card.handleChangingTargetTemperature({ detail: { changing: false } });
    expect(card.targetTemperatureChanging).toBe(false);
  });
});

describe('the sources filled after the first update', () => {
  // Not in `setConfig`: they come from the entity's `fan_modes` and
  // `hvac_modes`, and `setConfig` runs before the card has a `hass`. Read
  // straight after `setConfig` both lists are empty, which looks like a bug
  // from either side.
  const firstUpdate = card => card.firstUpdated(new Map([['climate', undefined]]));

  it('fills the fan mode and hvac mode lists from the entity', () => {
    const { card } = build({});
    // Not an empty list before the first update - no list at all.
    expect(card.fanModeConfig.source).toBeUndefined();

    firstUpdate(card);

    expect(Object.keys(card.fanModeConfig.source)).toEqual(['auto', 'low']);

    // The hvac list arrives as an array and is spread into an object, so its
    // keys are `0` and `1` rather than the mode ids. That works only because
    // each item carries its own `id` and `HvacModeObject.source` spreads the
    // item after the key it invents - `{ id: key, ...value }`. Pinned here
    // because the day an item stops carrying `id`, the dropdown silently
    // offers `0` and `1`.
    expect(Object.keys(card.config.hvac_mode.source)).toEqual(['0', '1']);
    expect(Object.values(card.config.hvac_mode.source).map(item => item.id)).toEqual([
      'off',
      'cool',
    ]);
    expect(card.hvacMode.source.map(item => item.id)).toEqual(['off', 'cool']);
  });

  it('leaves a list the configuration already named alone', () => {
    const { card } = build({
      fan_mode: { source: { auto: 'Auto only' } },
      hvac_mode: { source: { cool: 'Cooling only' } },
    });

    firstUpdate(card);

    expect(card.fanModeConfig.source).toEqual({ auto: 'Auto only' });
    expect(card.config.hvac_mode.source).toEqual({ cool: 'Cooling only' });
  });

  it('takes the target temperature value when that model arrives', () => {
    const { card } = build({});
    card.targetTemperatureValue = undefined;

    card.firstUpdated(new Map([['targetTemperature', undefined]]));

    expect(card.targetTemperatureValue).toBe(22);
  });
});

describe('what the card picker inserts', () => {
  // `getStubConfig` is what fills the YAML when the card is picked from the
  // list, and it is called with every entity in the installation. It runs
  // nowhere else, which is why nothing else notices when it is wrong.
  it('prefers a climate entity nobody has used yet', () => {
    expect(Card.getStubConfig({}, ['light.hall', 'climate.spare'], ['climate.taken'])).toEqual({
      entity: 'climate.spare',
    });
  });

  it('falls back to one that is already on a dashboard', () => {
    expect(Card.getStubConfig({}, ['light.hall'], ['light.hall', 'climate.taken'])).toEqual({
      entity: 'climate.taken',
    });
  });

  it('answers undefined when the installation has no climate entity at all', () => {
    // The picker then inserts a card with no entity, which `setConfig` refuses
    // with the domain message - the honest outcome, and better than guessing.
    expect(Card.getStubConfig({}, ['light.hall'], ['light.hall'])).toEqual({ entity: undefined });
  });
});

describe('the defaults a card gets when it configures nothing', () => {
  const entity = { entity_id: 'climate.living_room' };

  it('sends the fan mode through climate.set_fan_mode', () => {
    const { card, callService } = build({});
    // The signature a button hands its `change_action`: selected, state,
    // entity. The state in the middle is the argument two documentation
    // tables used to omit (#194).
    card.fanModeConfig.functions.change_action('low', 'auto', entity);
    expect(callService).toHaveBeenCalledWith('climate', 'set_fan_mode', {
      entity_id: 'climate.living_room',
      fan_mode: 'low',
    });
  });

  it('sends the mode through climate.set_hvac_mode', () => {
    const { card, callService } = build({});
    card.config.hvac_mode.functions.change_action('heat', entity);
    expect(callService).toHaveBeenCalledWith('climate', 'set_hvac_mode', {
      entity_id: 'climate.living_room',
      hvac_mode: 'heat',
    });
  });

  it('lights the mode control while the unit is on, and not while it is off', () => {
    expect(build({}).card.config.hvac_mode.functions.active()).toBe(true);
    expect(
      build({}, { entity: climateEntity({}, 'off') }).card.config.hvac_mode.functions.active(),
    ).toBe(false);
  });

  it('draws the icon unless a card says otherwise', () => {
    expect(build({}).card.shouldHideIcon()).toBe(false);
    expect(build({ hide_icon: true }).card.shouldHideIcon()).toBe(true);
  });

  it('compiles a boolean hide into a function, for a button and for the toggle', () => {
    // A boolean and a template both end up as `functions.hide`, so everything
    // downstream has one thing to call.
    const { card } = build({
      buttons: { boost: { icon: 'mdi:fire', hide: true } },
      toggle: { hide: true },
    });
    const boost = card.config.buttons.find(button => button.id === 'boost');
    expect(boost.functions.hide()).toBe(true);
    expect(card.config.toggle.functions.hide()).toBe(true);
  });
});
