// What `scale` scales, measured on the icons rather than on the boxes around
// them (#287, raised out of #162).
//
// This belongs here rather than in `test/browser/`, and not by preference:
// `ha-icon` draws its glyph itself, at `--mdc-icon-size`, and the stand-in
// that layer renders carries a `display` and nothing else. An assertion about
// the size of the drawing has nothing to measure there. It is the same reason
// #270 is a bench scenario.
//
// Before the fix, three components scaled - the ones that set `--mdc-icon-size`
// themselves - and the entity icon, the chevrons, the toggle, every button and
// every dropdown stayed at the browser's 24px default however large the card
// was made.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dialogs, open } from '../bench/browser.mjs';
import { DASHBOARD, prepare } from '../bench/setup.mjs';
import { BASE } from '../bench/auth.mjs';

const VIEW = 5;

describe('scale (#287)', () => {
  let bench;
  let session;

  // Every icon the card draws, by where it is drawn, with the size of the
  // glyph rather than of the element around it. The two disagreed for the
  // whole of this bug: the element scaled and the drawing did not.
  const glyphs = name =>
    session.page.evaluate(cardName => {
      const deep = (root, tag, found = []) => {
        for (const element of root.querySelectorAll('*')) {
          if (element.localName === tag) found.push(element);
          if (element.shadowRoot) deep(element.shadowRoot, tag, found);
        }
        return found;
      };

      const card = deep(document, 'mini-climate').find(
        one => (one.config && one.config.name) === cardName,
      );
      if (!card) return null;

      const measured = deep(card.shadowRoot, 'ha-icon').map(icon => {
        const svg =
          icon.shadowRoot?.querySelector('svg') ??
          icon.shadowRoot?.querySelector('ha-svg-icon')?.shadowRoot?.querySelector('svg');

        return {
          owner: icon.getRootNode()?.host?.localName ?? 'mini-climate',
          inButton: icon.parentElement?.localName === 'ha-icon-button',
          icon: icon.icon ?? null,
          glyph: svg ? +svg.getBoundingClientRect().height.toFixed(1) : null,
        };
      });

      return { unit: getComputedStyle(card).getPropertyValue('--mc-unit').trim(), measured };
    }, name);

  const find = (card, predicate) => card.measured.filter(predicate);

  // Three components size their own icons at .5 of the unit rather than the
  // shared .6 - the indicators and the two that draw the secondary info line.
  // They are held to their own ratio further down; the sweeps are about the
  // rest, which is where the bug was.
  const OWN_RATIO = ['mc-indicators', 'mc-secondary-info', 'mc-fan-mode-secondary'];
  const shared = card => find(card, one => OWN_RATIO.includes(one.owner) === false);

  before(async () => {
    bench = await prepare();
    session = await open(bench.tokens);

    await session.page.goto(`${BASE}/${DASHBOARD}/${VIEW}`, { waitUntil: 'load' });
    await session.page.waitForSelector('mini-climate', { timeout: 60000 });
    await session.page.waitForTimeout(1500);

    const modal = await dialogs(session.page);
    assert.deepEqual(modal, [], 'something modal is covering the dashboard');
  });

  after(async () => {
    if (session) await session.close();
  });

  it('draws every icon at 24px on a card that is not scaled', async () => {
    const card = await glyphs('Scale 1');
    assert.ok(card, 'the card is not on the dashboard');

    // The default is what must not move: .6 of a 40px unit is the 24px the
    // card was drawing before the fix, so nobody who never set `scale` sees a
    // different card.
    const icons = shared(card);
    assert.ok(icons.length >= 6, JSON.stringify(card.measured));

    for (const one of icons) {
      assert.equal(one.glyph, 24, `${one.owner} ${one.icon}: ${JSON.stringify(card.measured)}`);
    }
  });

  it('doubles every icon on a card at scale 2', async () => {
    const card = await glyphs('Scale 2');
    assert.ok(card, 'the card is not on the dashboard');

    const icons = shared(card);
    assert.ok(icons.length >= 6, JSON.stringify(card.measured));

    for (const one of icons) {
      assert.equal(one.glyph, 48, `${one.owner} ${one.icon}: ${JSON.stringify(card.measured)}`);
    }
  });

  it('scales the icons that sit inside an ha-icon-button, which is where it failed', async () => {
    // Named rather than left to the sweep above: the chevrons, the buttons and
    // the dropdowns are the ones the report was about, and they are all icons
    // slotted into an `ha-icon-button`. A sweep that stopped matching them
    // would still pass while the bug came back.
    const one = await glyphs('Scale 1');
    const two = await glyphs('Scale 2');

    const slotted = card => find(card, item => item.inButton);
    assert.ok(slotted(one).length >= 4, JSON.stringify(one.measured));
    assert.equal(slotted(one).length, slotted(two).length, 'the two cards are not the same card');

    for (const item of slotted(one)) assert.equal(item.glyph, 24, item.icon);
    for (const item of slotted(two)) assert.equal(item.glyph, 48, item.icon);
  });

  it('leaves the indicators to the size they set for themselves', async () => {
    // The other half of the fix, and the reason it is safe: the rule is on
    // `ha-icon`, and the components that want a different size set
    // `--mdc-icon-size` on a class, which wins on specificity. If that stopped
    // being true the indicators would jump from .5 of the unit to .6 - a
    // change nobody asked for, on every card.
    const one = await glyphs('Scale 1');
    const two = await glyphs('Scale 2');

    const indicators = card => find(card, item => OWN_RATIO.includes(item.owner));
    assert.ok(indicators(one).length >= 1, JSON.stringify(one.measured));

    for (const item of indicators(one)) assert.equal(item.glyph, 20, item.icon);
    for (const item of indicators(two)) assert.equal(item.glyph, 40, item.icon);
  });
});
