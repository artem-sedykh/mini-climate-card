import { aTimeout, expect, nextFrame } from '@open-wc/testing';
import { components, mountCard, settle } from './helpers/card.js';
import { ENTITY_ID } from './helpers/hass.js';

const find = (card, name) => components(card).find(component => component.localName === name);

const openMenuOf = async (host, card) => {
  const base = host.shadowRoot.querySelector('mc-dropdown-base');
  base.shadowRoot.getElementById('button').click();

  const menu = base.shadowRoot.getElementById('menu');
  await menu.updateComplete;
  await nextFrame();
  await settle(card);

  return menu;
};

describe('one interaction, one command', () => {
  it('sends one set_hvac_mode when a mode is picked', async () => {
    const { card, hass } = await mountCard();
    const menu = await openMenuOf(find(card, 'mc-mode-menu'), card);

    menu.shadowRoot.querySelector('[data-value="cool"]').click();
    await settle(card);

    expect(hass.calls).to.have.lengthOf(1);
    expect(hass.calls[0].service).to.equal('set_hvac_mode');
    expect(hass.calls[0].options.hvac_mode).to.equal('cool');
    expect(hass.calls[0].options.entity_id).to.equal(ENTITY_ID);
  });

  it('sends one set_temperature for a run of presses, with the value they add up to', async () => {
    const { card, hass } = await mountCard();
    const target = find(card, 'mc-target-temperature');
    const up = target.shadowRoot.querySelector('.temp.--up');

    // Three presses of half a degree each, on a target of 22. The control
    // waits 800ms after the last one and sends the total - a card that sent
    // each press would reach the device three times and fight the user's
    // finger on the way.
    up.click();
    up.click();
    up.click();

    expect(hass.calls, 'nothing before the wait is over').to.have.lengthOf(0);

    await aTimeout(1000);
    await settle(card);

    expect(hass.calls).to.have.lengthOf(1);
    expect(hass.calls[0].service).to.equal('set_temperature');
    expect(hass.calls[0].options.temperature).to.equal(23.5);
    expect(hass.calls[0].options.entity_id).to.equal(ENTITY_ID);
  });

  it('stops at the maximum the entity declares', async () => {
    const { card, hass } = await mountCard({ attributes: { temperature: 30 } });
    const target = find(card, 'mc-target-temperature');

    target.shadowRoot.querySelector('.temp.--up').click();
    await aTimeout(1000);
    await settle(card);

    // `max_temp` is 30, so the press changed nothing and there is nothing to
    // send. A card that sent it anyway would ask the device for a temperature
    // it has already refused.
    expect(hass.calls).to.have.lengthOf(0);
  });

  it('sends one switch.toggle for a button, aimed at the button entity', async () => {
    const { card, hass } = await mountCard({
      config: {
        buttons: {
          // A button's own entity is named under `state`, which is also where
          // the value it shows comes from.
          plug: { icon: 'mdi:power', state: { entity: 'switch.bedroom_plug' } },
        },
      },
    });

    card.toggle = true;
    await settle(card);

    const button = find(card, 'mc-button');
    button.shadowRoot.querySelector('ha-icon-button').click();
    await settle(card);

    expect(hass.calls).to.have.lengthOf(1);
    expect(hass.calls[0].domain).to.equal('switch');
    expect(hass.calls[0].service).to.equal('toggle');
    // The button's own entity, not the card's.
    expect(hass.calls[0].options.entity_id).to.equal('switch.bedroom_plug');
  });

  it('renders a button icon from a template, not from a raw object', async () => {
    const { card } = await mountCard({
      config: {
        buttons: {
          mode: {
            location: 'main',
            icon: { template: '(state) => state === "heat" ? "mdi:fire" : "mdi:snowflake"' },
          },
        },
      },
    });

    const button = find(card, 'mc-button');
    const icon = button.shadowRoot.querySelector('ha-icon');
    expect(icon.icon).to.equal('mdi:fire');
  });

  it('changes a dropdown button icon by its preset mode', async () => {
    // The #49 case on a dropdown: the icon the button shows follows the state.
    // `boost` -> fan-chevron-up, `eco` -> fan-chevron-down, `none` -> fan-speed-3.
    const { card, hass } = await mountCard({
      config: {
        buttons: {
          preset_mode: {
            type: 'dropdown',
            location: 'main',
            icon: {
              template:
                "(state) => state === 'boost' ? 'mdi:fan-chevron-up' : state === 'eco' ? 'mdi:fan-chevron-down' : 'mdi:fan-speed-3'",
            },
            state: { attribute: 'preset_mode' },
            active: 'state => state !== "none"',
            source: { none: 'Plain', boost: 'Turbo', eco: 'Quiet' },
          },
        },
      },
      attributes: { preset_mode: 'none' },
    });

    const shownIcon = () => {
      const dropdown = find(card, 'mc-dropdown');
      // The button lives inside mc-dropdown-base, whose own shadow root holds
      // the ha-icon-button - both are enclosed, so the query has to go down
      // both roots.
      const base = dropdown.shadowRoot.querySelector('mc-dropdown-base');
      return base.shadowRoot.querySelector('.mc-dropdown__button ha-icon').icon;
    };

    expect(shownIcon()).to.equal('mdi:fan-speed-3');

    // Change the entity and hand it back: the `hass` setter rebuilds the
    // button models, which re-runs the icon template with the new state.
    const setPreset = value => {
      const states = { ...hass.states };
      states[ENTITY_ID] = {
        ...states[ENTITY_ID],
        attributes: { ...states[ENTITY_ID].attributes, preset_mode: value },
      };
      card.hass = { ...hass, states };
    };

    setPreset('boost');
    await settle(card);
    expect(shownIcon()).to.equal('mdi:fan-chevron-up');

    setPreset('eco');
    await settle(card);
    expect(shownIcon()).to.equal('mdi:fan-chevron-down');
  });

  it('offers nothing to press while the entity is unavailable', async () => {
    const { card, hass } = await mountCard({ state: 'unavailable' });

    expect(find(card, 'mc-target-temperature')).to.be.undefined;
    expect(find(card, 'mc-mode-menu')).to.be.undefined;

    card.shadowRoot.querySelector('ha-card').click();
    await settle(card);

    expect(hass.calls).to.have.lengthOf(0);
  });

  it('picks the unit from the raw value and the shown value from the mapper', async () => {
    // `mapper` turns 1500 W into 1.5; `unit.template` reads the *raw* value
    // (its second argument) to choose kW/W, so the indicator shows "1.5 kW".
    const { card, hass } = await mountCard({
      config: {
        indicators: {
          power: {
            icon: 'mdi:flash',
            source: {
              entity: 'sensor.bedroom_power',
              mapper: value => value / 1000,
            },
            unit: {
              template: (_mapped, value) => (value > 1000 ? 'kW' : 'W'),
            },
          },
        },
      },
    });

    const states = { ...hass.states };
    states['sensor.bedroom_power'] = {
      entity_id: 'sensor.bedroom_power',
      state: 1500,
      attributes: { unit_of_measurement: 'W' },
    };
    card.hass = { ...hass, states };
    await settle(card);

    const indicators = card.shadowRoot.querySelector('mc-indicators');
    const indicator = indicators.shadowRoot.querySelector('.state');
    expect(indicator.querySelector('.state__value').textContent.trim()).to.equal('1.5');
    expect(indicator.querySelector('.state__uom').textContent.trim()).to.equal('kW');
  });
});

// `location` is the one button option that decides nothing about the button
// and everything about where it is: `main` puts it in the control row beside
// the mode icon, and the default puts it behind the toggle. Nothing asserted
// that until now - the option appeared in these tests only as a way of making
// a button reachable without opening the panel, which is not the same as
// saying it lands in the right row.
//
// The rows are two different elements, so the assertions are on the container
// each button ends up in. Where they sit in pixels is `layout.test.js`.
describe('where a button is drawn', () => {
  const mainRow = card => [...card.shadowRoot.querySelectorAll('.ctl-wrap mc-button')];

  const behindTheToggle = card => {
    const panel = card.shadowRoot.querySelector('.mc-toggle_content mc-buttons');
    return panel ? [...panel.shadowRoot.querySelectorAll('mc-button')] : [];
  };

  it('puts location: main in the control row and leaves the rest behind the toggle', async () => {
    const { card } = await mountCard({
      config: {
        // Open from the start, so both rows are rendered and the assertion is
        // about which one holds what rather than about the toggle.
        toggle: { default: true },
        buttons: {
          boost: { icon: 'mdi:fire', location: 'main' },
          eco: { icon: 'mdi:leaf' },
        },
      },
    });

    expect(mainRow(card).map(button => button.button.id)).to.eql(['boost']);
    expect(behindTheToggle(card).map(button => button.button.id)).to.eql(['eco']);
  });

  it('sorts the control row by order, and keeps it before the mode icon', async () => {
    const { card } = await mountCard({
      config: {
        buttons: {
          // Declared the wrong way round on purpose: `order` is what decides,
          // not the order the keys are written in.
          second: { icon: 'mdi:leaf', location: 'main', order: 2 },
          first: { icon: 'mdi:fire', location: 'main', order: 1 },
        },
      },
    });

    expect(mainRow(card).map(button => button.button.id)).to.eql(['first', 'second']);

    const row = [...card.shadowRoot.querySelector('.ctl-wrap').children].map(
      element => element.localName,
    );
    expect(row).to.eql(['mc-button', 'mc-button', 'mc-mode-menu', 'mc-temperature']);
  });

  it('takes the fan mode into the control row on the same option', async () => {
    // `fan_mode` is a button like any other - `setConfig` pushes it into
    // `config.buttons` under that id - so `location` moves it the same way,
    // and it arrives as the dropdown it is rather than as a plain button.
    const { card } = await mountCard({
      config: { toggle: { default: true }, fan_mode: { location: 'main' } },
    });

    const row = [...card.shadowRoot.querySelectorAll('.ctl-wrap mc-dropdown')];
    expect(row.map(dropdown => dropdown.dropdown.id)).to.eql(['fan_mode']);

    const panel = card.shadowRoot.querySelector('.mc-toggle_content mc-buttons');
    const behind = panel ? [...panel.shadowRoot.querySelectorAll('mc-dropdown')] : [];
    expect(behind.map(dropdown => dropdown.dropdown.id)).to.eql([]);
  });

  it('leaves the fan mode being said twice unless the secondary info is given something else', async () => {
    // The caveat the recipe carries: the secondary info line shows the fan
    // mode by default, so moving the dropdown up puts the same thing in two
    // places at once. It is not a bug to fix here - the line is configurable,
    // and this is what says so.
    const saysFanMode = card => {
      const info = card.shadowRoot.querySelector('mc-secondary-info');
      return !!(info && info.shadowRoot.querySelector('mc-fan-mode-secondary'));
    };

    const twice = await mountCard({ config: { fan_mode: { location: 'main' } } });
    expect(saysFanMode(twice.card), 'the default line still says it').to.be.true;

    const once = await mountCard({
      config: { fan_mode: { location: 'main' }, secondary_info: 'hvac-action' },
    });
    expect(saysFanMode(once.card), 'the line was given something else to say').to.be.false;
  });

  it('draws no toggle button when there is nothing left behind the toggle', async () => {
    const { card } = await mountCard({
      config: {
        // The fan mode is a button like any other, under the id `fan_mode`,
        // and it goes behind the toggle unless it is hidden - so a card with
        // one main button still has a panel until this line.
        fan_mode: { hide: true },
        buttons: { boost: { icon: 'mdi:fire', location: 'main' } },
      },
    });

    // Both assertions on strings and booleans rather than on the elements: a
    // DOM node in a failure report hangs the runner until its timeout with no
    // output, which reads like a broken test rather than a failed one. This
    // one was written the other way first and did exactly that.
    expect(mainRow(card).map(button => button.button.id)).to.eql(['boost']);
    expect(!!card.shadowRoot.querySelector('.toggle-button'), 'nothing left to open').to.be.false;
  });
});

describe('a tap on a temperature reading (#65)', () => {
  // The values, in the order the card draws them: the target first, the
  // current one after the separator.
  const values = card =>
    [...find(card, 'mc-temperature').shadowRoot.querySelectorAll('.state__value')].filter(
      span => span.textContent.trim() !== '/',
    );

  // `hass-more-info` is composed and does not bubble, so the listener has to
  // sit on a shadow host along the path - which the card is, and which is how
  // Home Assistant itself hears the event.
  const listen = card => {
    const seen = [];
    card.addEventListener('hass-more-info', event => seen.push(event.detail));
    return seen;
  };

  it('does nothing, and says nothing, when no action is configured', async () => {
    const { card } = await mountCard();
    const seen = listen(card);

    for (const span of values(card)) {
      expect(span.classList.contains('clickable'), 'not drawn as clickable').to.be.false;
      span.click();
    }
    await settle(card);

    expect(seen).to.have.lengthOf(0);
  });

  it('opens more-info for the climate entity from either reading', async () => {
    const { card } = await mountCard({
      config: {
        temperature: { tap_action: 'more-info' },
        target_temperature: { tap_action: 'more-info' },
      },
    });
    const seen = listen(card);

    const [target, current] = values(card);
    expect(target.classList.contains('clickable')).to.be.true;
    expect(current.classList.contains('clickable')).to.be.true;

    target.click();
    current.click();
    await settle(card);

    expect(seen).to.eql([{ entityId: ENTITY_ID }, { entityId: ENTITY_ID }]);
  });

  it('opens the sensor the reading comes from, not the climate entity', async () => {
    // The case the request was about: a current temperature taken from a
    // separate sensor, whose history is not reachable from the card at all
    // without this.
    const { card } = await mountCard({
      config: {
        temperature: { source: { entity: 'sensor.bedroom_humidity' }, tap_action: 'more-info' },
      },
    });
    const seen = listen(card);

    values(card)[1].click();
    await settle(card);

    expect(seen).to.eql([{ entityId: 'sensor.bedroom_humidity' }]);
  });

  it('calls a service with the hass the card is holding', async () => {
    // Which is the whole of the plumbing this needed: the model reaches hass
    // through the climate, and a missing one would only show up here.
    const { card, hass } = await mountCard({
      config: {
        temperature: {
          tap_action: { action: 'call-service', service: 'climate.turn_off' },
        },
      },
    });

    values(card)[1].click();
    await settle(card);

    expect(hass.calls).to.have.lengthOf(1);
    expect(hass.calls[0].domain).to.equal('climate');
    expect(hass.calls[0].service).to.equal('turn_off');
  });

  it('keeps the reading tappable when the temperatures are swapped', async () => {
    const { card } = await mountCard({
      config: { swap_temperatures: true, temperature: { tap_action: 'more-info' } },
    });
    const seen = listen(card);

    // Swapped, the current temperature is drawn first.
    const [current, target] = values(card);
    expect(target.classList.contains('clickable'), 'the target was not configured').to.be.false;
    current.click();
    await settle(card);

    expect(seen).to.eql([{ entityId: ENTITY_ID }]);
  });
});
