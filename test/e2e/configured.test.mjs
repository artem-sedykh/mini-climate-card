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

  // What the showcase card is showing when a wait gives up: whether the row is
  // open, whether a click would close it, and what sits on top of the toggle.
  // The last flake (#36 on HA latest) died as `timed out: last value null`.
  const panelState = async () => {
    const fromCard = await card.evaluate(host => {
      const root = host.shadowRoot;
      const toggle = root?.querySelector('.toggle-button');
      const row = root?.querySelector('mc-buttons');
      const box = element => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { w: +rect.width.toFixed(1), h: +rect.height.toFixed(1) };
      };
      const atToggle = (() => {
        if (!toggle) return [];
        const rect = toggle.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        return [...document.elementsFromPoint(x, y)].slice(0, 5).map(element => element.localName);
      })();
      const menus = [];
      const popovers = [];
      const walk = node => {
        for (const element of node.querySelectorAll('*')) {
          if (element.localName === 'mc-menu') {
            menus.push({
              open: !!element.open,
              items: element.shadowRoot?.querySelectorAll('.mc-menu__item').length ?? 0,
            });
          }
          try {
            if (element.matches(':popover-open')) popovers.push(element.localName);
          } catch {
            // The selector is missing in an engine that has no popover.
          }
          if (element.shadowRoot) walk(element.shadowRoot);
        }
      };
      if (root) walk(root);

      return {
        name: root?.querySelector('.entity__info__name')?.textContent.trim() ?? null,
        toggle: host.toggle,
        toggleDefault: host.config?.toggle?.default ?? null,
        toggleClass: toggle?.getAttribute('class') ?? null,
        toggleBox: box(toggle),
        atToggle,
        buttons: !!row,
        buttonIds: row?.shadowRoot
          ? [...row.shadowRoot.querySelectorAll('mc-button, mc-dropdown')].map(
              element => element.button?.id || element.dropdown?.id || element.localName,
            )
          : [],
        menus,
        popovers,
      };
    });

    return {
      ...fromCard,
      locatorButtons: await card.locator('mc-buttons').count(),
      locatorToggle: await card.locator('.toggle-button').count(),
      dialogs: await dialogs(session.page),
      pageErrors: session.errors.slice(),
    };
  };

  // Whether the row is open, asked of the card rather than of the document.
  // `host.toggle` is what the card decides with and `mc-buttons` is what it
  // renders from that, so a disagreement between the two is a render in
  // progress rather than an answer.
  const rowOpen = () =>
    card.evaluate(host => !!host.toggle && !!host.shadowRoot?.querySelector('mc-buttons'));

  // ...and read until two reads in a row agree, because the question is asked
  // straight after a scenario that changed entity state, which is exactly when
  // a single read lands mid-update. That is how this helper came to close the
  // row it was meant to open: the guard below read "no row" from a card that
  // had one, and clicked.
  const settledRowOpen = async () => {
    let last = await rowOpen();

    for (let read = 0; read < 5; read += 1) {
      await session.page.waitForTimeout(150);
      const now = await rowOpen();
      if (now === last) return now;
      last = now;
    }
    return last;
  };

  // The showcase card starts with the button row open (`toggle.default`), so
  // a click on the toggle would close it. Open only when the row is missing -
  // and check afterwards, because a click that arrives while the card thinks
  // otherwise closes the row instead, and one more click puts it back. Three
  // attempts rather than one: a helper that gives up on the first wrong turn
  // fails the scenario for a reason that has nothing to do with the card.
  const ensureButtonsOpen = async () => {
    const attempts = [];

    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (await settledRowOpen()) return;

      attempts.push({ attempt, before: await panelState() });
      await card.locator('.toggle-button').first().click();
      await session.page.waitForTimeout(500);

      if (await settledRowOpen()) return;
      attempts[attempts.length - 1].after = await panelState();
    }

    throw new Error(`the button row would not stay open: ${JSON.stringify(attempts)}`);
  };

  it('sends a dropdown button through its own change_action', async () => {
    // The buttons live behind the toggle, which is what a person presses too.
    await ensureButtonsOpen();
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

      // Wait for the menu to have something in it rather than for 400ms
      // (#304), but keep the loop's tolerance: a dropdown that opens nothing
      // is passed over, as it was before, instead of failing the scenario
      // here. The one being looked for is found by its labels below.
      const labels = await until(
        async () => {
          const found = await session.page.locator('.mc-menu__item__label').allTextContents();
          return found.length ? found : null;
        },
        { timeout: 5000 },
      ).catch(() => []);

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
    await ensureButtonsOpen();
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

  it("keeps a hidden button's slot in the row (#36)", async () => {
    // `hide` would drop the button and let the rest of the row close up. The
    // answer is a dummy button that stays in the flex, with its icon hidden -
    // that is what lines up a shared template across units that do not all
    // have the same extras.
    await ensureButtonsOpen();

    const slots = await until(
      async () => {
        const now = await card.evaluate(host => {
          const row = host.shadowRoot.querySelector('mc-buttons');
          if (!row) return [];
          return [...row.shadowRoot.querySelectorAll('mc-button, mc-dropdown')].map(element => {
            const iconButton =
              element.shadowRoot.querySelector('ha-icon-button') ||
              element.shadowRoot
                .querySelector('mc-dropdown-base')
                ?.shadowRoot.querySelector('ha-icon-button');
            return {
              id: element.button?.id || element.dropdown?.id || null,
              visibility: iconButton ? getComputedStyle(iconButton).visibility : null,
              width: element.getBoundingClientRect().width,
            };
          });
        });
        return now.some(slot => slot.visibility === 'hidden') ? now : null;
      },
      { diagnose: panelState },
    );

    const spacers = slots.filter(slot => slot.visibility === 'hidden');
    const visible = slots.filter(slot => slot.visibility === 'visible');

    assert.equal(spacers.length, 2, JSON.stringify(slots));
    assert.ok(visible.length >= 2, JSON.stringify(slots));

    for (const spacer of spacers) {
      assert.ok(spacer.width > 0, `${spacer.id} collapsed`);
      assert.ok(
        Math.abs(spacer.width - visible[0].width) < 1,
        `${spacer.id} ${spacer.width} vs ${visible[0].width}`,
      );
    }

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
    //
    // The row is opened here rather than inherited from the scenario before.
    // When that one left it closed, this failed too, thirty seconds later and
    // saying nothing about the switch it is named after.
    await ensureButtonsOpen();

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
      { timeout: 30000, diagnose: panelState },
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
    // class - and the temperature on this card has no tap_action of its own
    // (#65 gave it one, and the view for it is elsewhere), so a scenario that
    // clicked it would be measuring nothing while looking correct.
    const states = card.locator('mc-indicators .state');
    // All three indicators render here only once their entities are in
    // `hass.states`; a fresh bench registers bench entities asynchronously, so
    // assert the count only after it has settled (flaky #275).
    //
    // Thirty seconds rather than the default ten, for the reason the
    // `power_switch` wait was raised in v3.2.0: on a bench that has just come
    // up the fixtures register more slowly than the ten seconds allow, and the
    // pinned version loses that race while `latest` wins it. The `diagnose`
    // is the other half - a bare timeout reports `last value null`, which does
    // not tell "no indicators yet" from "two of the three".
    await until(async () => ((await states.count()) >= 3 ? true : null), {
      timeout: 30000,
      diagnose: async () => ({
        indicators: await states.count(),
        rendered: await states.allTextContents(),
      }),
    });

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
