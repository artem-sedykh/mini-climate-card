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

  it('is a real button in the dropdown form', async () => {
    const { card } = await mountCard({ config: { secondary_info: 'fan-mode-dropdown' } });
    const button = secondary(card).shadowRoot.getElementById('button');

    // This used to be `ha-icon-button`, which an older scoped registry never
    // upgraded: an inert unknown element, `display: inline`, on which
    // `disabled` did nothing. That was #216. It is a native `<button>` now, so
    // it is always upgraded, `disabled` works, and the whole drop - icon and
    // label - is the click target, not just the icon glyph.
    expect(button.localName).to.equal('button');
    expect(button.shadowRoot, 'native button has no shadow root').to.not.exist;
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

describe('the hvac mode under the name (#194)', () => {
  it('reads the current mode by its label and is a real button', async () => {
    const { card } = await mountCard({
      config: { secondary_info: 'hvac-mode-dropdown', hvac_mode: { hide: true } },
    });
    const host = secondary(card);
    const button = host.shadowRoot.getElementById('button');

    expect(host.shadowRoot.querySelector('.name').textContent.trim()).to.equal('Heat');
    expect(button.localName).to.equal('button');
    expect(button.shadowRoot, 'native button has no shadow root').to.not.exist;
  });

  it('opens its menu and sends one set_hvac_mode', async () => {
    const { card, hass } = await mountCard({
      config: { secondary_info: 'hvac-mode-dropdown', hvac_mode: { hide: true } },
    });
    const host = secondary(card);

    host.shadowRoot.getElementById('button').click();
    const menu = host.shadowRoot.getElementById('menu');
    await menu.updateComplete;
    await nextFrame();

    menu.shadowRoot.querySelector('[data-value="cool"]').click();
    await settle(card);

    expect(hass.calls).to.have.lengthOf(1);
    expect(hass.calls[0].service).to.equal('set_hvac_mode');
    expect(hass.calls[0].options.hvac_mode).to.equal('cool');
  });

  it('draws the glyph of the mode, not the icon the section was built with', async () => {
    // `getButtonConfig` builds `hvac_mode` like any other section and gives it
    // `icon: mdi:radiobox-marked`, so this line drew that one glyph for every
    // mode until the model stopped reading it. The entity reports `heat`.
    const { card } = await mountCard({
      config: { secondary_info: 'hvac-mode-dropdown', hvac_mode: { hide: true } },
    });

    expect(secondary(card).shadowRoot.querySelector('ha-icon').icon).to.equal('mdi:weather-sunny');
  });

  it('still lets secondary_info.icon freeze the glyph', async () => {
    const { card } = await mountCard({
      config: {
        secondary_info: { type: 'hvac-mode-dropdown', icon: 'mdi:thermostat' },
        hvac_mode: { hide: true },
      },
    });

    expect(secondary(card).shadowRoot.querySelector('ha-icon').icon).to.equal('mdi:thermostat');
  });

  it('leaves a hidden mode out of the list, and picks by the list it shows', async () => {
    // `source:item:hide` takes a mode out of the control-row menu, so it takes
    // it out of this one too. The pick arrives as an index, which is why the
    // hidden mode is first here: a component that filtered only what it
    // displays would send `off` for a press on `Cool`.
    const { card, hass } = await mountCard({
      config: {
        secondary_info: 'hvac-mode-dropdown',
        hvac_mode: {
          hide: true,
          source: { off: { name: 'Off', hide: true }, cool: 'Cool', heat: 'Heat' },
        },
      },
    });
    const host = secondary(card);

    expect(host.shadowRoot.querySelector('.name').textContent.trim()).to.equal('Heat');

    host.shadowRoot.getElementById('button').click();
    const menu = host.shadowRoot.getElementById('menu');
    await menu.updateComplete;
    await nextFrame();

    const listed = [...menu.shadowRoot.querySelectorAll('[data-value]')].map(
      item => item.dataset.value,
    );
    expect(listed).to.eql(['cool', 'heat']);

    menu.shadowRoot.querySelector('[data-value="cool"]').click();
    await settle(card);

    expect(hass.calls).to.have.lengthOf(1);
    expect(hass.calls[0].options.hvac_mode).to.equal('cool');
  });

  it('leaves the fan mode behind the toggle', async () => {
    const { card, hass } = await mountCard({
      config: {
        secondary_info: 'hvac-mode-dropdown',
        hvac_mode: { hide: true },
        toggle: { default: true },
      },
    });

    const panel = card.shadowRoot.querySelector('.mc-toggle_content mc-buttons');
    const ids = panel
      ? [...panel.shadowRoot.querySelectorAll('mc-dropdown')].map(dropdown => dropdown.dropdown.id)
      : [];
    expect(ids).to.eql(['fan_mode']);

    const host = secondary(card);
    host.shadowRoot.getElementById('button').click();
    const menu = host.shadowRoot.getElementById('menu');
    await menu.updateComplete;
    await nextFrame();
    menu.shadowRoot.querySelector('[data-value="cool"]').click();
    await settle(card);

    const fan = panel.shadowRoot.querySelector('mc-dropdown');
    const base = fan.shadowRoot.querySelector('mc-dropdown-base');
    base.shadowRoot.getElementById('button').click();
    const fanMenu = base.shadowRoot.getElementById('menu');
    await fanMenu.updateComplete;
    await nextFrame();
    fanMenu.shadowRoot.querySelector('[data-value="medium"]').click();
    await settle(card);

    expect(hass.calls.map(call => call.service)).to.eql(['set_hvac_mode', 'set_fan_mode']);
    expect(hass.calls[0].options.hvac_mode).to.equal('cool');
    expect(hass.calls[1].options.fan_mode).to.equal('medium');
  });

  it('does not open more-info from a click on the wrap', async () => {
    const { card } = await mountCard({ config: { secondary_info: 'hvac-mode-dropdown' } });
    let events = 0;
    card.addEventListener('hass-more-info', () => {
      events += 1;
    });

    card.shadowRoot.querySelector('.entity__info__name_wrap').click();
    await settle(card);

    expect(events).to.equal(0);
  });
});
