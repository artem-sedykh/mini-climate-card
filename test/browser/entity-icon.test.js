// The left entity icon, when `icon` is a `{ template, style }` object.
//
// A string still tints the wrap with the `color` attribute while the unit is
// on. A style template owns the colour instead - otherwise a thermostat that
// stays in `heat` cannot look idle (#38). Assertions are on strings and
// booleans: a DOM node in a failure report hangs the runner.
import { expect } from '@open-wc/testing';
import { mountCard } from './helpers/card.js';

const wrap = card => card.shadowRoot.querySelector('.entity__icon');
const glyph = card => wrap(card)?.querySelector('ha-icon')?.icon ?? null;

const ICON = {
  template:
    "(entity) => entity.attributes.hvac_action === 'heating' ? 'mdi:radiator' : 'mdi:radiator-off'",
  style:
    "(entity) => ({ color: entity.attributes.hvac_action === 'heating' ? 'rgb(255, 0, 0)' : 'rgb(128, 128, 128)' })",
};

describe('the entity icon', () => {
  it('draws a string icon and tints it while the unit is on', async () => {
    const { card } = await mountCard({ config: { icon: 'mdi:radiator' } });

    expect(glyph(card)).to.equal('mdi:radiator');
    expect(wrap(card).hasAttribute('color')).to.equal(true);
  });

  it('picks the glyph from hvac_action', async () => {
    const heating = await mountCard({
      config: { icon: { template: ICON.template } },
      attributes: { hvac_action: 'heating' },
    });
    expect(glyph(heating.card)).to.equal('mdi:radiator');

    const idle = await mountCard({
      config: { icon: { template: ICON.template } },
      attributes: { hvac_action: 'idle' },
    });
    expect(glyph(idle.card)).to.equal('mdi:radiator-off');
  });

  it('lets style own the colour, so idle is not tinted by HVAC mode', async () => {
    // Default fixture is `heat` + `hvac_action: heating`. Without this skip,
    // `isActive` would put `color` on the wrap and idle could not look idle.
    const heating = await mountCard({
      config: { icon: ICON },
      attributes: { hvac_action: 'heating' },
    });

    expect(wrap(heating.card).hasAttribute('color')).to.equal(false);
    expect(getComputedStyle(wrap(heating.card)).color).to.equal('rgb(255, 0, 0)');

    const idle = await mountCard({
      config: { icon: ICON },
      state: 'heat',
      attributes: { hvac_action: 'idle' },
    });

    expect(glyph(idle.card)).to.equal('mdi:radiator-off');
    expect(wrap(idle.card).hasAttribute('color')).to.equal(false);
    expect(getComputedStyle(wrap(idle.card)).color).to.equal('rgb(128, 128, 128)');
  });
});
