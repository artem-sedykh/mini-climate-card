// The strings Home Assistant has for a climate entity, in the card (#133).
//
// This layer and no other. The keys live in Home Assistant, so a stub can only
// answer the keys it was written with - which is exactly how this went unseen:
// the fixtures named `state.climate.*` and `state_attributes.climate.*`, the
// card asked for the same, both agreed, and no Home Assistant had answered
// either for years. Every label on a real dashboard was drawn as its raw id.
//
// On an English dashboard the difference is one capital letter, which is why
// the report was filed as a question about German.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dialogs, open, until } from '../bench/browser.mjs';
import { DASHBOARD, prepare } from '../bench/setup.mjs';
import { BASE } from '../bench/auth.mjs';

describe('the labels Home Assistant has for the entity (#133)', () => {
  let bench;
  let session;
  let card;

  before(async () => {
    bench = await prepare();
    session = await open(bench.tokens);

    // The first view, first card: an entity and nothing else, so every label
    // here is one Home Assistant supplied rather than one the YAML renamed.
    await session.page.goto(`${BASE}/${DASHBOARD}/0`, { waitUntil: 'load' });
    await session.page.waitForSelector('mini-climate', { timeout: 60000 });
    await session.page.waitForTimeout(1500);

    const modal = await dialogs(session.page);
    assert.deepEqual(modal, [], 'something modal is covering the dashboard');

    card = session.page.locator('mini-climate').first();
  });

  after(async () => {
    if (session) await session.close();
  });

  it('translates the fan mode on the secondary info line', async () => {
    // Asserted against what Home Assistant itself would draw rather than
    // against a mode by name: the bench is long-lived and the scenarios before
    // this one leave the entity on whichever fan mode they picked. Comparing
    // with `localize` also keeps the assertion honest in English, where the
    // difference between a translation and the raw id is one capital letter.
    const shown = await card.evaluate(node => {
      const hass = document.querySelector('home-assistant').hass;
      const raw = hass.states[node.climate.id].attributes.fan_mode;
      const secondary = node.shadowRoot.querySelector('mc-secondary-info');
      const fan = secondary.shadowRoot.querySelector('mc-fan-mode-secondary');

      return {
        raw,
        label: fan.shadowRoot.querySelector('.name')?.textContent.trim() ?? null,
        expected: hass.localize(
          `component.climate.entity_component._.state_attributes.fan_mode.state.${raw}`,
        ),
      };
    });

    assert.equal(shown.label, shown.expected, JSON.stringify(shown));
    // And not vacuously: an empty translation would make the two agree on the
    // fallback, which is the state this issue is about.
    assert.notEqual(shown.label, shown.raw, JSON.stringify(shown));
  });

  it('translates the modes in the dropdown', async () => {
    const menu = card.locator('mc-mode-menu');

    await menu.evaluate(node => {
      node.shadowRoot.querySelector('mc-dropdown-base').shadowRoot.getElementById('button').click();
    });

    const labels = await until(async () => {
      const found = await menu.evaluate(node => {
        const base = node.shadowRoot.querySelector('mc-dropdown-base');
        const list = base?.shadowRoot.querySelector('mc-menu');
        if (!list) return [];
        return [...list.shadowRoot.querySelectorAll('.mc-menu__item__label')].map(el =>
          el.textContent.trim(),
        );
      });
      return found.length ? found : null;
    });

    // The entity reports off, cool, heat, dry and fan_only. Two of them are
    // asserted by name; `fan_only` is asserted as "not the id", because the
    // string Home Assistant uses for it is the kind of thing that gets
    // rewritten between releases and this test is not about its wording.
    assert.ok(labels.includes('Cool'), labels.join(' | '));
    assert.ok(labels.includes('Heat'), labels.join(' | '));
    assert.ok(!labels.includes('fan_only'), `an untranslated id in ${labels.join(' | ')}`);

    await session.page.keyboard.press('Escape');
  });

  it('translates the hvac action', async () => {
    // The model rather than the rendering: `hvac-action` is a secondary info
    // type no card on this view is using, and what is under test is the label
    // it would draw - the same `getLabel` call, on the same real translations.
    const action = await card.evaluate(node => node.climate.hvacAction);

    assert.equal(action.id, 'cooling');
    assert.equal(action.name, 'Cooling');
  });

  it('reports nothing to the console while doing it', async () => {
    assert.deepEqual(session.errors, []);
  });
});
