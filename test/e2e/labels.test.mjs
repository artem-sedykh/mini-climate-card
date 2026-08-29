// The strings Home Assistant has for a climate entity, in the card (#133).
//
// This layer and no other. The keys live in Home Assistant, so a stub can only
// answer the keys it was written with - which is exactly how this went unseen:
// the fixtures named `state.climate.*` and `state_attributes.climate.*`, the
// card asked for the same, both agreed, and no Home Assistant had answered
// either for years. Every label on a real dashboard was drawn as its raw id.
//
// **Nothing here names a translation key, and nothing here names an English
// word.** The card is compared with `hass.formatEntityState` and
// `hass.formatEntityAttributeValue` - the frontend's own formatters, the ones
// the built-in thermostat card draws with. So the claim under test is "the
// card says what Home Assistant would say", which stays true when the strings
// are rewritten, when the dashboard is in German, and - the reason it is
// written this way - when Home Assistant moves the keys again. A test that
// spelled out `component.climate.entity_component._.state.cool` would go on
// passing against the very move it exists to catch, because it would be
// asking the same dead key as the card.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dialogs, open, until } from '../bench/browser.mjs';
import { DASHBOARD, prepare } from '../bench/setup.mjs';
import { BASE } from '../bench/auth.mjs';

describe('the labels Home Assistant has for the entity (#133)', () => {
  let bench;
  let session;
  let card;

  // What the frontend itself would draw for this entity, asked of the frontend.
  const asHomeAssistantWouldDrawIt = () =>
    card.evaluate(node => {
      const hass = document.querySelector('home-assistant').hass;
      const stateObj = hass.states[node.climate.id];

      // The oracle is an API of the frontend like any other, so its absence is
      // news rather than a reason to skip: it arrived in 2023.9 and the card
      // reads the same translations through it.
      if (typeof hass.formatEntityState !== 'function') return { missing: true };

      return {
        modes: (stateObj.attributes.hvac_modes || []).map(mode => ({
          id: mode,
          label: hass.formatEntityState(stateObj, mode),
        })),
        fanMode: {
          id: stateObj.attributes.fan_mode,
          label: hass.formatEntityAttributeValue(stateObj, 'fan_mode'),
        },
        hvacAction: {
          id: stateObj.attributes.hvac_action,
          label: hass.formatEntityAttributeValue(stateObj, 'hvac_action'),
        },
      };
    });

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

  it('has an oracle to compare against, and it says something', async () => {
    const ha = await asHomeAssistantWouldDrawIt();
    assert.equal(ha.missing, undefined, 'hass.formatEntityState is gone; this suite needs it');

    // Not vacuous: on a Home Assistant with no strings at all every formatted
    // value would equal its id, and every assertion below would pass while the
    // card drew nothing but ids - which is the bug.
    const translated = ha.modes.filter(mode => mode.label !== mode.id);
    assert.ok(translated.length > 0, `nothing is translated at all: ${JSON.stringify(ha)}`);
  });

  it('draws the fan mode as Home Assistant draws it', async () => {
    const ha = await asHomeAssistantWouldDrawIt();

    const label = await card.evaluate(node => {
      const secondary = node.shadowRoot.querySelector('mc-secondary-info');
      const fan = secondary.shadowRoot.querySelector('mc-fan-mode-secondary');
      return fan.shadowRoot.querySelector('.name')?.textContent.trim() ?? null;
    });

    assert.equal(label, ha.fanMode.label, JSON.stringify({ label, ha: ha.fanMode }));
  });

  it('draws every mode in the dropdown as Home Assistant draws it', async () => {
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

    const ha = await asHomeAssistantWouldDrawIt();
    assert.deepEqual(
      labels,
      ha.modes.map(mode => mode.label),
    );

    await session.page.keyboard.press('Escape');
  });

  it('reads the hvac action as Home Assistant reads it', async () => {
    // The model rather than the rendering: `hvac-action` is a secondary info
    // type no card on this view is using, and what is under test is the label
    // it would draw - the same `getLabel` call, on the same translations.
    const ha = await asHomeAssistantWouldDrawIt();
    const action = await card.evaluate(node => node.climate.hvacAction);

    assert.equal(action.id, ha.hvacAction.id);
    assert.equal(action.name, ha.hvacAction.label);
  });

  it('reports nothing to the console while doing it', async () => {
    assert.deepEqual(session.errors, []);
  });
});
