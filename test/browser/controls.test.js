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
