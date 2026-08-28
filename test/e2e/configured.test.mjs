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

  it('changes a dropdown button icon by its preset mode', async () => {
    // `preset_mode` carries `icon: { template }`, from the case in #49: the
    // icon the button shows follows the preset. `boost` -> fan-chevron-up,
    // `eco` -> fan-chevron-down, anything else (`none`) -> fan-speed-3.
    if ((await card.locator('mc-dropdown').count()) === 0) {
      await card.locator('.toggle-button').first().click();
    }
    await until(async () => ((await card.locator('mc-dropdown').count()) > 0 ? true : null));

    // Find the preset dropdown by id, and only then look at its menu. Each
    // `mc-dropdown-base` renders its own `mc-menu`, and only while it is open,
    // so a query for menu items across the page reads whatever is open - a
    // leftover menu from the scenario before this one, or a neighbour.
    let preset = null;

    for (const one of await card.locator('mc-dropdown').all()) {
      const id = await one.evaluate(node => node.dropdown && node.dropdown.id);
      if (id === 'preset_mode') {
        preset = one;
        break;
      }
    }
    assert.notEqual(preset, null, 'no dropdown carries the preset_mode id');

    // Reads from this dropdown's own shadow tree only. The menu it answers is
    // the one this control opened, not whatever else on the page is showing.
    // `mc-menu` sits in `mc-dropdown-base`'s shadow root and renders its items
    // in *its own* shadow root, so the read goes two roots down.
    const readMenu = async () =>
      preset.evaluate(node => {
        const base = node.shadowRoot.querySelector('mc-dropdown-base');
        const menu = base?.shadowRoot.querySelector('mc-menu');
        if (!menu) return [];
        return [...menu.shadowRoot.querySelectorAll('.mc-menu__item__label')].map(el =>
          el.textContent.trim(),
        );
      });

    // Open the preset menu and confirm it offers the options the scenario is
    // about, from within this dropdown's own `<mc-menu>`.
    await preset.locator('ha-icon-button').first().click();
    await until(async () => {
      const labels = await readMenu();
      return labels.some(label => label === 'Turbo') ? labels : null;
    });
    await session.page.keyboard.press('Escape');
    await session.page.waitForTimeout(300);

    const shownIcon = () =>
      preset.evaluate(node => {
        const base = node.shadowRoot.querySelector('mc-dropdown-base');
        const icon = base.shadowRoot.querySelector('.mc-dropdown__button ha-icon');
        return icon ? icon.icon : null;
      });

    const pick = async (value, label, icon) => {
      // Open this dropdown's own menu and wait for the option to be there,
      // then click it from inside the same shadow tree. Neither a leftover
      // overlay nor another control can steal the click, and the wait tells
      // the menu is actually open before anything is pressed.
      await preset.locator('ha-icon-button').first().click();
      await until(async () => {
        const labels = await readMenu();
        return labels.some(one => one === label) ? labels : null;
      });
      await preset.evaluate((node, target) => {
        const base = node.shadowRoot.querySelector('mc-dropdown-base');
        const menu = base.shadowRoot.querySelector('mc-menu');
        const item = menu.shadowRoot.querySelector(`.mc-menu__item[data-value="${target}"]`);
        item.click();
      }, value);

      // The button takes the state optimistically, then the device confirms via
      // MQTT; the icon follows the state, so wait for it to settle.
      await until(async () => ((await shownIcon()) === icon ? icon : null), {
        timeout: 15000,
      });
      await session.page.keyboard.press('Escape');
      await session.page.waitForTimeout(300);
    };

    await pick('boost', 'Turbo', 'mdi:fan-chevron-up');
    await pick('eco', 'Quiet', 'mdi:fan-chevron-down');

    assert.deepEqual(session.errors, []);
  });

  it('toggles a switch that is both an indicator and a button', async () => {
    // `bench_plug` is read twice by this card: as the `power` indicator through
    // a `values`/`mapper` template, and as the `power_switch` button. One
    // press has to flip the entity and both readers follow - the "one entity,
    // two consumers" shape the bedroom card has.
    // Find the power_switch button by its model id, not by position. `bench_plug`
    // is not guaranteed to be in `hass.states` on the first read - MQTT discovery
    // and its retained state register asynchronously on a fresh bench, and the
    // card only builds a button for an entity it has a state for. So wait for the
    // button rather than assert it was there on the first read (flaky #275). The
    // `latest` bench registers MQTT fixtures the slowest, so the default ten
    // seconds is not enough there - see the long wait below for the same reason.
    const powerSwitch = card.locator('mc-buttons mc-button');
    const target = await until(
      async () => {
        const count = await powerSwitch.count();
        for (let i = 0; i < count; i += 1) {
          const id = await powerSwitch.nth(i).evaluate(node => node.button && node.button.id);
          if (id === 'power_switch') return powerSwitch.nth(i);
        }
        return null;
      },
      { timeout: 30000 },
    );

    const beforeState = (await entity(bench.tokens, bench.ids.bench_plug)).state;
    await target.locator('ha-icon-button').click();
    // The button flips optimistically and the device confirms via MQTT, so
    // wait for the entity to actually change.
    await until(async () => {
      const state = (await entity(bench.tokens, bench.ids.bench_plug)).state;
      return state !== beforeState ? state : null;
    });

    const afterState = (await entity(bench.tokens, bench.ids.bench_plug)).state;
    assert.notEqual(afterState, beforeState);

    // The indicator, which maps the same switch through values/mapper, has
    // followed: powered when on, idle when off.
    const expected = afterState === 'on' ? 'powered' : 'idle';
    const shown = await until(async () => {
      const states = await indicators();
      return states.some(text => text.includes(expected)) ? states : null;
    });
    assert.ok(
      shown.some(text => text.includes(expected)),
      shown.join(' | '),
    );

    // Leave the bench where the next scenario expects it: the suite starts
    // the plug ON, and the scenario that follows reads `powered`.
    await publish(bench.tokens, 'bench/plug/state', 'ON');
    await until(async () => {
      const state = (await entity(bench.tokens, bench.ids.bench_plug)).state;
      return state === 'on' ? true : null;
    });

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
    // All three indicators render here only once their entities are in
    // `hass.states`; a fresh bench registers bench entities asynchronously, so
    // assert the count only after it has settled (flaky #275).
    await until(async () => ((await states.count()) >= 3 ? true : null));

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
