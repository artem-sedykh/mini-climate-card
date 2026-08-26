import { expect, nextFrame } from '@open-wc/testing';
import { components, mountCard, settle } from './helpers/card.js';

const secondary = card =>
  components(card).find(component => component.localName === 'mc-fan-mode-secondary');

describe('the fan mode under the name', () => {
  it('reads the current mode by its label', async () => {
    const { card } = await mountCard();

    // The default `secondary_info`. It shows the label from the mode list
    // rather than the raw attribute, so this is the one place a card names a
    // translated mode without a menu being open.
    expect(secondary(card).shadowRoot.querySelector('.name').textContent.trim()).to.equal('Auto');
  });

  it('upgrades its own button in the dropdown form', async () => {
    const { card } = await mountCard({ config: { secondary_info: 'fan-mode-dropdown' } });
    const button = secondary(card).shadowRoot.getElementById('button');

    // This element used to be rendered without being declared to the scoped
    // registry, so it never upgraded: an inert unknown element, `display:
    // inline`, on which `disabled` did nothing. It was measured that way on a
    // running Home Assistant and fixed in #216, and nothing but a browser can
    // tell the difference.
    expect(button.localName).to.equal('ha-icon-button');
    expect(customElements.get('ha-icon-button'), 'defined').to.exist;
    expect(button.shadowRoot, 'upgraded').to.exist;
    expect(getComputedStyle(button).display).to.not.equal('inline');
  });

  it('still sends a command when the current mode is not in the source list', async () => {
    // A narrowed `source` - or an integration that added a mode after the card
    // was configured - leaves the entity reporting something the list does not
    // contain, and `fanMode.selected` is then undefined. Reading `.id` off it
    // threw inside the click handler, so the pick did nothing at all and said
    // nothing about it. See #231.
    const { card, hass } = await mountCard({
      config: {
        secondary_info: 'fan-mode-dropdown',
        fan_mode: { source: { low: 'Low', high: 'High' } },
      },
    });
    const host = secondary(card);

    host.shadowRoot.getElementById('button').click();
    const menu = host.shadowRoot.getElementById('menu');
    await menu.updateComplete;
    await nextFrame();

    menu.shadowRoot.querySelector('[data-value="high"]').click();
    await settle(card);

    expect(hass.calls).to.have.lengthOf(1);
    expect(hass.calls[0].options.fan_mode).to.equal('high');
  });

  it('opens its menu and sends one command', async () => {
    const { card, hass } = await mountCard({ config: { secondary_info: 'fan-mode-dropdown' } });
    const host = secondary(card);

    host.shadowRoot.getElementById('button').click();
    const menu = host.shadowRoot.getElementById('menu');
    await menu.updateComplete;
    await nextFrame();

    menu.shadowRoot.querySelector('[data-value="medium"]').click();
    await settle(card);

    expect(hass.calls).to.have.lengthOf(1);
    expect(hass.calls[0].service).to.equal('set_fan_mode');
    expect(hass.calls[0].options.fan_mode).to.equal('medium');
  });
});
