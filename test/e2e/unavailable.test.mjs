// An entity that cannot answer, in a real Home Assistant. The card has two
// ways of meeting one and they used to end very differently: an entity that is
// present and unavailable has always rendered its label, while an entity that
// is not in `hass.states` at all rendered an empty card and threw once per
// component (#46).
//
// Both are cheap to arrange here and impossible to arrange convincingly
// anywhere else: the first is an availability topic, the second is a card
// pointed at an id nothing publishes.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cards, open, publish, until } from '../bench/browser.mjs';
import { DASHBOARD, prepare } from '../bench/setup.mjs';
import { BASE } from '../bench/auth.mjs';

describe('an entity that cannot answer', () => {
  let bench;
  let session;

  const card = async name => {
    const rendered = await cards(session.page, 'mini-climate');
    return rendered.find(one => one.name === name || one.config.name === name);
  };

  before(async () => {
    bench = await prepare();
    session = await open(bench.tokens);

    await session.page.goto(`${BASE}/${DASHBOARD}/0`, { waitUntil: 'load' });
    await session.page.waitForSelector('mini-climate', { timeout: 60000 });
    await session.page.waitForTimeout(1500);
  });

  after(async () => {
    // Whatever a scenario did to the fixtures, the next one starts from the
    // manifest.
    if (bench) await publish(bench.tokens, 'bench/ac/availability', 'online');
    if (session) await session.browser.close();
  });

  it('draws the unavailable card for an entity that is not in hass.states', async () => {
    const missing = await card('Missing entity');

    assert.ok(missing, 'the card is not on the dashboard');
    assert.match(missing.classes, /--unavailable/);
    assert.match(missing.text, /Unavailable/);
    assert.ok(missing.height > 0, 'an empty card is what #46 looked like');

    // The four exceptions #46 threw came from these.
    for (const control of ['mc-mode-menu', 'mc-temperature', 'mc-target-temperature']) {
      assert.ok(!missing.components.includes(control), `${control} rendered anyway`);
    }
    assert.deepEqual(session.errors, []);
  });

  it('follows an entity that goes unavailable and comes back', async () => {
    const title = 'Bench air conditioner';

    await publish(bench.tokens, 'bench/ac/availability', 'offline');
    const gone = await until(async () => {
      const one = await card(title);
      return one && /--unavailable/.test(one.classes) ? one : null;
    });
    assert.match(gone.text, /Unavailable/);

    await publish(bench.tokens, 'bench/ac/availability', 'online');
    const back = await until(async () => {
      const one = await card(title);
      return one && !/--unavailable/.test(one.classes) ? one : null;
    });
    assert.ok(back.components.includes('mc-temperature'));
    assert.deepEqual(session.errors, []);
  });
});
