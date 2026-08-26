// The card as people actually write it, rather than as its defaults render.
// The configuration these scenarios run against is modelled on cards that are
// in daily use: modes and fan speeds renamed, indicators reading other
// entities, one of them mapping its value through a template, dropdown buttons
// that call a service of their own, and both spellings of `tap_action` in the
// same card.
//
// None of that is exercised by a card with nothing but an `entity`, and all of
// it is what the questions in the tracker are about.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dialogs, entity, open, publish, until } from '../bench/browser.mjs';
import { DASHBOARD, prepare } from '../bench/setup.mjs';
import { BASE } from '../bench/auth.mjs';

describe('a card written the way people write them', () => {
  let bench;
  let session;
  let card;

  const indicators = () =>
    session.page.evaluate(() => {
      const found = [];
      const walk = root => {
        for (const element of root.querySelectorAll('*')) {
          if (element.localName === 'mini-climate') {
            const states = [];
            const inner = node => {
              for (const child of node.querySelectorAll('*')) {
                if (child.classList?.contains('state')) {
                  states.push(child.textContent.replace(/\s+/g, ' ').trim());
                }
                if (child.shadowRoot) inner(child.shadowRoot);
              }
            };
            inner(element.shadowRoot);
            found.push(states);
          }
          if (element.shadowRoot) walk(element.shadowRoot);
        }
      };
      walk(document);
      return found[0] || [];
    });

  before(async () => {
    bench = await prepare();
    session = await open(bench.tokens);

    // The second view: one card, so nothing here has to say which.
    await session.page.goto(`${BASE}/${DASHBOARD}/1`, { waitUntil: 'load' });
    await session.page.waitForSelector('mini-climate', { timeout: 60000 });
    await session.page.waitForTimeout(1500);

    const modal = await dialogs(session.page);
    assert.deepEqual(modal, [], 'something modal is covering the dashboard');

    card = session.page.locator('mini-climate').first();
  });

  after(async () => {
    if (bench) await publish(bench.tokens, 'bench/plug/state', 'ON');
    if (session) await session.close();
  });

  it('sends a dropdown button through its own change_action', async () => {
    // The buttons live behind the toggle, which is what a person presses too.
    await card.locator('.toggle-button').first().click();
    await session.page.waitForTimeout(500);

    const dropdowns = card.locator('mc-dropdown');
    const count = await dropdowns.count();
    assert.ok(count > 0, 'no dropdown buttons rendered');

    // Found by what it offers rather than by its position: if the order in the
    // manifest changes, this fails saying so instead of quietly driving a
    // different control.
    let swing = null;

    for (let index = 0; index < count; index += 1) {
      const one = dropdowns.nth(index);
      await one.locator('ha-icon-button').first().click();
      await session.page.waitForTimeout(400);

      const labels = await session.page.locator('.mc-menu__item__label').allTextContents();

      if (labels.map(label => label.trim()).includes('Sweeping')) {
        swing = index;
        break;
      }
      await session.page.keyboard.press('Escape');
      await session.page.waitForTimeout(300);
    }

    assert.notEqual(swing, null, 'no dropdown offers the renamed swing modes');

    const before_ = await entity(bench.tokens, bench.ids.bench_ac_remote);
    assert.equal(before_.attributes.swing_mode, 'off');

    await session.page.locator('.mc-menu__item[data-value="vertical"]').first().click();

    const after_ = await until(async () => {
      const state = await entity(bench.tokens, bench.ids.bench_ac_remote);
      return state.attributes.swing_mode === 'vertical' ? state : null;
    });
    assert.equal(after_.attributes.swing_mode, 'vertical');
    assert.deepEqual(session.errors, []);
  });

  it('maps an indicator value through the template context', async () => {
    // `mapper: value => this.source.values[value]` - `this` is the option's own
    // YAML, which is the extension point the card is built on. A card that lost
    // it would show the raw `on` and `off` here.
    const powered = await until(async () => {
      const states = await indicators();
      return states.some(text => text.includes('powered')) ? states : null;
    });
    assert.ok(
      powered.some(text => text.includes('powered')),
      powered.join(' | '),
    );

    await publish(bench.tokens, 'bench/plug/state', 'OFF');

    const idle = await until(async () => {
      const states = await indicators();
      return states.some(text => text.includes('idle')) ? states : null;
    });
    assert.ok(
      idle.every(text => !text.includes('powered')),
      idle.join(' | '),
    );
  });

  it('opens more-info from an indicator, whichever way tap_action is written', async () => {
    // `tap_action: more-info` on one indicator and `tap_action: { action:
    // more-info }` on another. The string form is the one that was a dead
    // click on the card itself until #234.
    //
    // Scoped to `mc-indicators`, because `.state` is also the temperature's
    // class - and the temperature has no tap_action, so a scenario that
    // clicked it would be measuring nothing while looking correct.
    const states = card.locator('mc-indicators .state');
    const count = await states.count();
    assert.equal(count, 3, 'the manifest card has three indicators');

    for (const index of [0, 1]) {
      await states.nth(index).click();
      const open_ = await until(async () => {
        const found = await dialogs(session.page);
        return found.length ? found : null;
      });
      assert.ok(open_.length > 0, `indicator ${index} opened nothing`);

      await session.page.keyboard.press('Escape');
      await until(async () => {
        const found = await dialogs(session.page);
        return found.length === 0 ? true : null;
      });
    }

    // The third has no tap_action at all, and is the control: without it, a
    // detector that answered "open" to anything would pass the two above.
    await states.nth(2).click();
    await session.page.waitForTimeout(1500);
    assert.deepEqual(await dialogs(session.page), [], 'an indicator with no tap_action opened one');

    assert.deepEqual(session.errors, []);
  });
});
