// Preset modes as a row of buttons rather than a single dropdown. The answer to
// #153, and the bare facts behind #41 and #171: this is what `active` does, and
// how a button reads an attribute of the climate entity.
//
// A climate entity can have only one preset, so a row of buttons works by
// mapping the attribute to on/off per button and sending the chosen one on
// press. That is the whole trick, and it is worth having asserted rather than
// only answered - the same question was asked in 2021 and again in 2024.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { callService, dialogs, open, until } from '../bench/browser.mjs';
import { DASHBOARD, prepare } from '../bench/setup.mjs';
import { BASE } from '../bench/auth.mjs';

describe('a row of preset buttons', () => {
  let bench;
  let session;

  before(async () => {
    bench = await prepare();
    session = await open(bench.tokens);

    await session.page.goto(`${BASE}/${DASHBOARD}/0`, { waitUntil: 'load' });
    await session.page.waitForSelector('mini-climate', { timeout: 60000 });
    await session.page.waitForTimeout(1500);

    const modal = await dialogs(session.page);
    assert.deepEqual(modal, [], 'something modal is covering the dashboard');

    // The preset buttons live behind the toggle, like every other button; a
    // row of them is not visible until the chevron is pressed.
    const card = session.page.locator('mini-climate').filter({ hasText: 'Preset buttons' });
    await card.locator('.toggle-button').first().click();
    await session.page.waitForTimeout(1200);
    await card.locator('mc-button').first().waitFor({ state: 'visible' });
  });

  after(async () => {
    if (bench) {
      await callService(bench.tokens, 'climate', 'set_preset_mode', {
        entity_id: bench.ids.bench_ac,
        preset_mode: 'none',
      });
    }
    if (session) await session.close();
  });

  const card = () => session.page.locator('mini-climate').filter({ hasText: 'Preset buttons' });

  // A button's highlight is the icon's **colour**, which follows `active` - the
  // accent, amber by default, against the default icon colour. The background
  // does not change; that was the wrong thing to look for, and it cost a run.
  const ACTIVE = 'rgb(255, 193, 7)';

  const activeButtons = async () => {
    const buttons = card().locator('mc-button');
    const count = await buttons.count();
    const lit = [];

    for (let index = 0; index < count; index += 1) {
      const colour = await buttons
        .nth(index)
        .locator('ha-icon')
        .evaluate(element => getComputedStyle(element).color);

      if (colour === ACTIVE) lit.push(index);
    }
    return lit;
  };

  it('highlights the preset the entity holds', async () => {
    await callService(bench.tokens, 'climate', 'set_preset_mode', {
      entity_id: bench.ids.bench_ac,
      preset_mode: 'eco',
    });

    // `until` around the colour, because the fixture is optimistic MQTT and the
    // fixture's editor may take a moment to settle after the service call.
    const lit = await until(async () => {
      const active = await activeButtons();
      return active.length === 1 ? active : null;
    });
    assert.deepEqual(lit, [0], 'the entity holds eco, so the eco button is lit');
  });

  it('moves the highlight when the preset changes, by press and by service', async () => {
    // The `after` hook resets to none, so this starts from the same place the
    // previous test started from - a row with no preset selected. Setting it
    // here rather than relying on the test before keeps the two independent.
    await callService(bench.tokens, 'climate', 'set_preset_mode', {
      entity_id: bench.ids.bench_ac,
      preset_mode: 'eco',
    });

    const first = await until(async () => {
      const active = await activeButtons();
      return active.length === 1 ? active : null;
    });
    assert.deepEqual(first, [0], 'eco is lit first');

    // By press - the scenario pressing the other button. After the press there
    // is a moment where no button is lit - the old preset has gone out before
    // the new one comes in - so the poll waits for boost specifically rather
    // than for "some one active".
    await card().locator('mc-button').nth(1).click();

    const afterPress = await until(async () => {
      const active = await activeButtons();
      return active.includes(1) ? active : null;
    });
    assert.ok(afterPress.includes(1), 'the highlight moved to boost');
    assert.deepEqual(afterPress, [1], 'exactly the boost button is lit');
  });
});
