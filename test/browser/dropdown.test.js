import { aTimeout, expect, nextFrame } from '@open-wc/testing';
import { components, mountCard, settle } from './helpers/card.js';
import { FAN_MODES } from './helpers/hass.js';

// The fan mode dropdown, which is the one every card has: `mc-dropdown` holds
// an `mc-dropdown-base`, which holds the button and the `mc-menu`.
const fanModeDropdown = card => {
  const dropdown = components(card).find(component => component.localName === 'mc-dropdown');
  const base = dropdown.shadowRoot.querySelector('mc-dropdown-base');

  return {
    base,
    button: base.shadowRoot.getElementById('button'),
    menu: base.shadowRoot.getElementById('menu'),
  };
};

const open = async card => {
  card.toggle = true;
  await settle(card);

  const parts = fanModeDropdown(card);
  parts.button.click();
  await parts.menu.updateComplete;
  await nextFrame();

  return parts;
};

const labels = menu =>
  [...menu.shadowRoot.querySelectorAll('.mc-menu__item')].map(option => option.dataset.value);

describe('the fan mode dropdown', () => {
  it('lists every fan mode and marks the current one', async () => {
    const { card } = await mountCard();
    const { menu } = await open(card);

    expect(labels(menu)).to.eql(FAN_MODES);

    const selected = menu.shadowRoot.querySelector('[aria-selected="true"]');

    expect(selected.dataset.value).to.equal('auto');
    // The current option takes focus when the menu opens, so the keyboard
    // starts where the user is rather than at the top of the list.
    expect(menu.shadowRoot.activeElement.dataset.value).to.equal('auto');
  });

  it('opens in the top layer where the browser has one', async () => {
    const { card } = await mountCard();
    const { menu } = await open(card);
    const surface = menu.shadowRoot.getElementById('surface');

    // Both engines here have the popover API. The failure this guards is the
    // half-way case: an element carrying `popover="manual"` that was never
    // shown is `display: none`, so a menu that failed to reach the top layer
    // would be invisible rather than merely un-layered.
    expect(surface.matches(':popover-open')).to.be.true;

    const box = surface.getBoundingClientRect();

    expect(box.width, 'width').to.be.greaterThan(0);
    expect(box.height, 'height').to.be.greaterThan(0);
  });

  it('sends exactly one command for one pick, and closes', async () => {
    const { card, hass } = await mountCard();
    const { menu } = await open(card);

    menu.shadowRoot.querySelector('[data-value="high"]').click();
    await settle(card);

    expect(hass.calls).to.have.lengthOf(1);
    expect(hass.calls[0].domain).to.equal('climate');
    expect(hass.calls[0].service).to.equal('set_fan_mode');
    expect(hass.calls[0].options.fan_mode).to.equal('high');
    expect(hass.calls[0].options.entity_id).to.equal('climate.bedroom');

    expect(menu.open).to.be.false;
  });

  it('reports nothing when the option picked is the current one', async () => {
    const { card, hass } = await mountCard();
    const { menu } = await open(card);

    menu.shadowRoot.querySelector('[data-value="auto"]').click();
    await settle(card);

    expect(hass.calls).to.have.lengthOf(0);
    expect(menu.open).to.be.false;
  });

  it('moves the focus with the arrow keys', async () => {
    const { card } = await mountCard();
    const { menu } = await open(card);
    const surface = menu.shadowRoot.getElementById('surface');

    surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(menu.shadowRoot.activeElement.dataset.value).to.equal('low');

    surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(menu.shadowRoot.activeElement.dataset.value).to.equal('auto');

    surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(menu.shadowRoot.activeElement.dataset.value).to.equal('high');
  });

  it('closes on Escape and hands the focus back to the button', async () => {
    const { card } = await mountCard();
    const { menu, button } = await open(card);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle(card);

    expect(menu.open).to.be.false;
    // The stand-in for `ha-icon-button` carries a tabindex for this reason:
    // the real one wraps a button and takes focus.
    expect(button.matches(':focus')).to.be.true;
  });

  it('closes on a press outside itself', async () => {
    const { card } = await mountCard();
    const { menu } = await open(card);

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await settle(card);

    expect(menu.open).to.be.false;
  });

  it('stays inside the window when its anchor is at the edge', async () => {
    const { card } = await mountCard();

    // Push the card into the bottom right corner, where an unclamped menu
    // would be drawn off screen in both directions.
    card.style.position = 'fixed';
    card.style.width = '300px';
    card.style.right = '0';
    card.style.bottom = '0';
    await nextFrame();

    const { menu } = await open(card);
    // The position is set from `updated`, after the surface can be measured.
    await aTimeout(50);

    const box = menu.shadowRoot.getElementById('surface').getBoundingClientRect();

    expect(box.left, 'left').to.be.at.least(0);
    expect(box.top, 'top').to.be.at.least(0);
    expect(box.right, 'right').to.be.at.most(window.innerWidth);
    expect(box.bottom, 'bottom').to.be.at.most(window.innerHeight);
  });
});
