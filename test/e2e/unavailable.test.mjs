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
import { cards, dialogs, open, publish, until } from '../bench/browser.mjs';
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

    // A modal over the cards makes every click time out with a message about
    // stability that says nothing about the modal. Named here instead.
    const modal = await dialogs(session.page);
    assert.deepEqual(modal, [], 'something modal is covering the dashboard');
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

  it('holds together when the icon is hidden and the entity is unavailable', async () => {
    // Two changes meet here and nothing covered the meeting: `hide_icon`
    // (#248) removes the element everything beside it is centred against, and
    // the class that centres the name when there is no secondary info (#100)
    // is set for an unavailable card by construction, because an unavailable
    // card has no secondary info.
    const hidden = await card('Hidden parts');

    assert.ok(hidden, 'the card is not on the dashboard');
    assert.equal(hidden.icon, false, 'hide_icon left the icon in place');
    assert.ok(hidden.height > 0);
    assert.equal(hidden.overflows, false, 'the card draws past its own edge');

    await publish(bench.tokens, 'bench/ac/availability', 'offline');
    const offline = await until(async () => {
      const one = await card('Hidden parts');
      return one && /--unavailable/.test(one.classes) ? one : null;
    });

    assert.equal(offline.icon, false, 'the icon came back with the label');
    assert.match(offline.text, /Unavailable/);
    assert.ok(offline.height > 0, 'an unavailable card with no icon collapsed');
    assert.equal(offline.overflows, false);

    await publish(bench.tokens, 'bench/ac/availability', 'online');
    await until(async () => {
      const one = await card('Hidden parts');
      return one && !/--unavailable/.test(one.classes) ? one : null;
    });
    assert.deepEqual(session.errors, []);
  });

  it('runs a hide_icon template against an entity that has no state', async () => {
    // `hide_icon` takes a template as well as a boolean, and the template is
    // handed the entity. On a card whose entity is missing there is no entity
    // to hand it - the card passes the empty object it holds instead, and a
    // template reading `.state` off it has to get `undefined` rather than
    // throw.
    const templated = await card('Missing and icon templated');

    assert.ok(templated, 'the card is not on the dashboard');
    assert.match(templated.text, /Unavailable/);
    assert.equal(templated.icon, true, 'undefined state is not the string unavailable');
    assert.deepEqual(session.errors, []);
  });

  it('hides the icon only while the entity is offline, when told to by template', async () => {
    const title = 'Icon hidden while offline';

    const before = await card(title);
    assert.equal(before.icon, true, 'the icon is hidden while the entity answers');

    await publish(bench.tokens, 'bench/ac/availability', 'offline');
    const offline = await until(async () => {
      const one = await card(title);
      return one && one.icon === false ? one : null;
    });
    assert.match(offline.classes, /--unavailable/);
    assert.ok(offline.height > 0);

    await publish(bench.tokens, 'bench/ac/availability', 'online');
    const back = await until(async () => {
      const one = await card(title);
      return one && one.icon === true ? one : null;
    });
    assert.ok(!/--unavailable/.test(back.classes));
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
