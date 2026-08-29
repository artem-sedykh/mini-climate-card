// What `fixed` is for, measured rather than described (#163).
//
// The report was not "the value is wrong" - it was that a column of indicators
// in a vertical stack does not line up. `round` answers a number, so a reading
// that rounds to a whole one loses its decimal point, the value box narrows,
// and everything to the right of it slides along. That is a geometry claim, so
// it is measured here: `test/browser/` renders against stand-ins, and the two
// engines there agree about text but not about the layout a real dashboard
// gives a card inside a vertical-stack.
//
// The view holds four cards - two on `round`, two on `fixed` - reading the same
// pair of sources, where one climate entity reports a whole number and the
// other does not. That is the smallest arrangement in which the bug exists at
// all: with one card there is nothing to be out of line with.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dialogs, open } from '../bench/browser.mjs';
import { DASHBOARD, prepare } from '../bench/setup.mjs';
import { BASE } from '../bench/auth.mjs';

const VIEW = 6;

describe('fixed decimals on an indicator (#163)', () => {
  let bench;
  let session;

  // Every card on the view at once: the question is about how they line up
  // with each other, so reading them one at a time would lose the answer.
  const rows = () =>
    session.page.evaluate(() => {
      const deep = (root, tag, found = []) => {
        for (const element of root.querySelectorAll('*')) {
          if (element.localName === tag) found.push(element);
          if (element.shadowRoot) deep(element.shadowRoot, tag, found);
        }
        return found;
      };

      return deep(document, 'mini-climate').map(card => {
        const indicators = card.shadowRoot.querySelector('mc-indicators');
        const states = [...indicators.shadowRoot.querySelectorAll('.state')];

        return {
          name: (card.config && card.config.name) || null,
          values: states.map(state => state.querySelector('.state__value').textContent.trim()),
          // Where the second indicator starts. Not its width and not the text:
          // this is the number a person notices, because it is the one that
          // makes two cards look ragged.
          secondLeft: +states[1].getBoundingClientRect().left.toFixed(1),
        };
      });
    });

  const byName = (all, name) => all.find(one => one.name === name);

  before(async () => {
    bench = await prepare();
    session = await open(bench.tokens, { viewport: { width: 1400, height: 1000 } });

    await session.page.goto(`${BASE}/${DASHBOARD}/${VIEW}`, { waitUntil: 'load' });
    await session.page.waitForSelector('mini-climate', { timeout: 60000 });
    await session.page.waitForTimeout(1500);

    const modal = await dialogs(session.page);
    assert.deepEqual(modal, [], 'something modal is covering the dashboard');
  });

  after(async () => {
    if (session) await session.close();
  });

  it('keeps the decimal place that round drops', async () => {
    const all = await rows();
    assert.equal(all.length, 4, JSON.stringify(all));

    // 24.0 is the reading that tells the two options apart. 21.5 is the
    // control: it has a decimal either way, so both options must agree on it,
    // and a change that broke `round` outright would show up here.
    assert.equal(byName(all, 'AC (round)').values[0], '24');
    assert.equal(byName(all, 'AC (fixed)').values[0], '24.0');
    assert.equal(byName(all, 'Valve (round)').values[0], '21.5');
    assert.equal(byName(all, 'Valve (fixed)').values[0], '21.5');
  });

  it('lines the next indicator up across the stack, which round does not', async () => {
    const all = await rows();

    const roundPair = [byName(all, 'AC (round)'), byName(all, 'Valve (round)')];
    const fixedPair = [byName(all, 'AC (fixed)'), byName(all, 'Valve (fixed)')];

    // The whole of #163, as a number. Measured at 11.1px when this was
    // written, so the assertion is on there being a gap rather than on its
    // size - the size is a font metric and would make this a brittle test
    // about the theme.
    const ragged = Math.abs(roundPair[0].secondLeft - roundPair[1].secondLeft);
    assert.ok(ragged > 5, `round should be ragged, off by ${ragged}px: ${JSON.stringify(all)}`);

    const aligned = Math.abs(fixedPair[0].secondLeft - fixedPair[1].secondLeft);
    assert.equal(aligned, 0, `fixed should line up, off by ${aligned}px: ${JSON.stringify(all)}`);
  });
});
