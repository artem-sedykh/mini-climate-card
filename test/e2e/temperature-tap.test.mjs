// A tap on a temperature reading, in a real frontend (#65).
//
// The card builds `hass-more-info` as a composed event that does not bubble,
// and it reaches Home Assistant only because such an event is still delivered
// to the shadow hosts along its path. That is a claim about the frontend, not
// about the card: `test/browser/` listens on the card element itself, which
// says the event was dispatched and nothing about who hears it. This layer is
// where "the dialog opened" can be asserted.
//
// The view holds two cards, and the second one is the point: a detector that
// answers "open" to anything would pass every assertion below without it
// (#188 and the three wrong answers recorded in ha-live-testing).
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dialogs, open, until } from '../bench/browser.mjs';
import { DASHBOARD, prepare } from '../bench/setup.mjs';
import { BASE } from '../bench/auth.mjs';

const VIEW = 7;

describe('a tap on a temperature reading (#65)', () => {
  let bench;
  let session;
  let cards;

  // The two readings of one card, in the order the card draws them: the
  // target first, the current one after the separator. Scoped to
  // `mc-temperature`, because `.state__value` is also what an indicator
  // renders.
  const readings = index =>
    cards
      .nth(index)
      .locator('mc-temperature .state__value')
      .filter({ hasNotText: '/' });

  // Which entity the dialog is showing. `entityId` on the dialog is null at
  // the moment it opens, and its `textContent` is empty because everything is
  // in a shadow root - so the name is read from inside it.
  const showing = () =>
    session.page.evaluate(() => {
      const walk = root => {
        for (const element of root.querySelectorAll('*')) {
          if (element.localName === 'ha-more-info-dialog' && element.shadowRoot) {
            if (element.shadowRoot.children.length > 0) {
              return element.shadowRoot.textContent.replace(/\s+/g, ' ').trim();
            }
          }
          const found = element.shadowRoot ? walk(element.shadowRoot) : null;
          if (found) return found;
        }
        return null;
      };
      return walk(document);
    });

  const close = async () => {
    await session.page.keyboard.press('Escape');
    await until(async () => ((await dialogs(session.page)).length === 0 ? true : null));
  };

  before(async () => {
    bench = await prepare();
    session = await open(bench.tokens);

    await session.page.goto(`${BASE}/${DASHBOARD}/${VIEW}`, { waitUntil: 'load' });
    await session.page.waitForSelector('mini-climate', { timeout: 60000 });
    await session.page.waitForTimeout(1500);

    const modal = await dialogs(session.page);
    assert.deepEqual(modal, [], 'something modal is covering the dashboard');

    cards = session.page.locator('mini-climate');
  });

  after(async () => {
    if (session) await session.close();
  });

  it('opens more-info for the card entity from the current temperature', async () => {
    await readings(0).nth(1).click();

    const text = await until(async () => (await showing()) || null);
    assert.match(text, /Bench air conditioner/);

    await close();
  });

  it('opens the entity the action names from the target temperature', async () => {
    // Two readings, two options: the target is configured to open a different
    // entity entirely, which is also what tells the two spans apart.
    await readings(0).nth(0).click();

    const text = await until(async () => (await showing()) || null);
    assert.match(text, /Bench radiator valve/);

    await close();
  });

  it('opens nothing from a card that did not ask for it', async () => {
    // The control. Both readings of a card with no tap_action, which is every
    // card that existed before this option.
    for (const index of [0, 1]) {
      await readings(1).nth(index).click();
    }
    await session.page.waitForTimeout(1500);

    assert.deepEqual(await dialogs(session.page), [], 'a reading with no tap_action opened one');
    assert.deepEqual(session.errors, []);
  });
});
