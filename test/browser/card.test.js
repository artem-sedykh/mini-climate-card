import { expect } from '@open-wc/testing';
import { components, countRenders, mountCard, settle } from './helpers/card.js';
import { ENTITY_ID } from './helpers/hass.js';

describe('the card in a browser', () => {
  it('renders the climate entity and its components', async () => {
    const { card } = await mountCard();

    // The buttons sit behind the toggle, and the fan mode dropdown is one of
    // them: a card whose toggle is shut renders less than half of itself.
    card.toggle = true;
    await settle(card);

    expect(card.shadowRoot.querySelector('ha-card')).to.exist;
    expect(card.shadowRoot.querySelector('.entity__info__name').textContent.trim()).to.equal(
      'Bedroom air conditioner',
    );

    const rendered = components(card).map(component => component.localName);

    expect(rendered).to.include.members([
      'mc-secondary-info',
      'mc-fan-mode-secondary',
      'mc-mode-menu',
      'mc-temperature',
      'mc-target-temperature',
      'mc-indicators',
      'mc-buttons',
      'mc-dropdown',
      'mc-dropdown-base',
      'mc-menu',
    ]);

    // A component that renders an empty template says nothing about it, which
    // is the failure this asserts against: the card would still be there, only
    // hollow. That is what a missing element definition used to do to every
    // one of them at once.
    //
    // `mc-menu` is the one legitimate exception - a closed menu renders
    // nothing until it is opened, which the dropdown tests cover.
    for (const component of components(card)) {
      if (component.localName === 'mc-menu') continue;
      expect(component.shadowRoot.childElementCount, component.localName).to.be.greaterThan(0);
    }
  });

  it('shows both temperatures', async () => {
    const { card } = await mountCard();

    const temperature = components(card).find(c => c.localName === 'mc-temperature');
    const text = temperature.shadowRoot.textContent.replace(/\s+/g, ' ');

    // The current temperature and the target, in that order: 24 now, set to 22.
    expect(text).to.contain('24');
    expect(text).to.contain('22');
  });

  it('renders an unavailable entity instead of throwing', async () => {
    const { card } = await mountCard({ state: 'unavailable' });

    expect(card.shadowRoot.querySelector('ha-card').className).to.contain('--unavailable');
    expect(card.shadowRoot.querySelector('.label').textContent.trim()).to.equal('Unavailable');

    // The controls that would otherwise act on an entity that cannot be acted
    // on.
    expect(card.shadowRoot.querySelector('mc-target-temperature')).to.not.exist;
    expect(card.shadowRoot.querySelector('mc-mode-menu')).to.not.exist;
  });

  it('renders the unavailable card when the entity is not in hass.states', async () => {
    // A card whose entity was renamed or deleted, or whose integration drops
    // entities instead of marking them unavailable (#46). What used to happen
    // is worth naming, because the card looked broken rather than
    // unconfigured: `this.climate` stayed the empty object the constructor
    // sets, its missing `isUnavailable` getter read `undefined`, and the
    // controls rendered against models built from nothing - an empty card and
    // four exceptions per render.
    const { card } = await mountCard({ config: { entity: 'climate.not_here' } });

    expect(card.shadowRoot.querySelector('ha-card').className).to.contain('--unavailable');
    expect(card.shadowRoot.querySelector('.label').textContent.trim()).to.equal('Unavailable');
    expect(card.shadowRoot.querySelector('mc-mode-menu')).to.not.exist;
    expect(card.shadowRoot.querySelector('mc-temperature')).to.not.exist;
    expect(card.shadowRoot.querySelector('mc-target-temperature')).to.not.exist;
  });

  it('stops showing readings once the entity disappears', async () => {
    // The same guard skipped the update when an entity that had been there
    // went away, so the card kept the last temperatures it had seen and gave
    // no sign they were old.
    const { card, hass } = await mountCard();

    expect(card.shadowRoot.querySelector('mc-temperature')).to.exist;

    const states = { ...hass.states };
    delete states[ENTITY_ID];
    card.hass = { ...hass, states };
    await settle(card);

    expect(card.shadowRoot.querySelector('ha-card').className).to.contain('--unavailable');
    expect(card.shadowRoot.querySelector('.label').textContent.trim()).to.equal('Unavailable');
    expect(card.shadowRoot.querySelector('mc-temperature')).to.not.exist;
  });

  it('falls back when Home Assistant has no translation for the state', async () => {
    const { card } = await mountCard({ state: 'unavailable' });

    card.hass = { ...card.hass, localize: () => '' };
    await settle(card);

    expect(card.shadowRoot.querySelector('.label').textContent.trim()).to.equal('Unavailable');
  });

  it('renders nothing again when the same state comes back', async () => {
    // Home Assistant assigns `hass` on every state change anywhere in the
    // installation, not only on this card's entities, so an assignment that
    // carries no news has to cost nothing.
    const { card, hass } = await mountCard();

    card.toggle = true;
    await settle(card);

    const counts = countRenders([card, ...components(card)]);

    card.hass = hass;
    await settle(card);

    for (const [element, renders] of counts) {
      expect(renders, element.localName).to.equal(0);
    }
  });

  it('opens more-info for a tap_action written as a string', async () => {
    // `tap_action: more-info` as a bare string is how the option reads in the
    // documentation of every card, and until #234 writing it that way here
    // produced a card that looked clickable and did nothing.
    const { card } = await mountCard({ config: { tap_action: 'more-info' } });

    let events = 0;
    card.addEventListener('hass-more-info', () => {
      events += 1;
    });

    card.shadowRoot.querySelector('.entity__info__name_wrap').click();
    await settle(card);

    expect(events).to.equal(1);
  });

  it('offers the pointer only when the click does something', async () => {
    // Both spellings of "do nothing": the documented string, and the object
    // Home Assistant's own editors write. Before #234 the name carried
    // `cursor: pointer` whatever the configuration said, and the `--more-info`
    // class that was meant to decide it compared an object against a string
    // and was read by no stylesheet.
    const cursorOf = card =>
      getComputedStyle(card.shadowRoot.querySelector('.entity__info__name_wrap')).cursor;

    expect(cursorOf((await mountCard()).card)).to.equal('pointer');
    expect(cursorOf((await mountCard({ config: { tap_action: 'none' } })).card)).to.not.equal(
      'pointer',
    );
    expect(
      cursorOf((await mountCard({ config: { tap_action: { action: 'none' } } })).card),
    ).to.not.equal('pointer');
  });

  it('costs one render pass per component when the entity changes', async () => {
    const { card, hass } = await mountCard();

    // The buttons sit behind the toggle, so open it: a component that is not
    // rendered cannot be counted.
    card.toggle = true;
    await settle(card);

    const counts = countRenders([card, ...components(card)]);
    const entity = hass.states[ENTITY_ID];

    hass.states[ENTITY_ID] = {
      ...entity,
      last_updated: new Date('2026-01-01T00:01:00Z').toISOString(),
      attributes: { ...entity.attributes, fan_mode: 'high', current_temperature: 25 },
    };

    card.hass = hass;

    // lit resolves this to `false` when an update was requested from inside the
    // update cycle - which is what deriving state in `updated()` instead of
    // `willUpdate()` does.
    expect(await card.updateComplete).to.be.true;
    await settle(card);

    for (const [element, renders] of counts) {
      expect(renders, element.localName).to.be.at.most(1);
    }
  });
});
