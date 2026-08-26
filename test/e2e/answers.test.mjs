// The answers this tracker gives, as tests.
//
// Every card in the third view of the manifest is an answer someone was given
// to a question: how to draw a card with nothing but the temperature (#40),
// how to show an indicator's icon without its value (#64), how to shorten a
// value (#57), how to colour the mode icon by what the unit is doing (#62,
// #129), how to colour an indicator by the mode (#168).
//
// They are here rather than only in a reply because an answer that lives in a
// comment is one nobody notices breaking. Each of these was asked more than
// once, over years.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { callService, dialogs, open, publish, until } from '../bench/browser.mjs';
import { DASHBOARD, prepare } from '../bench/setup.mjs';
import { BASE } from '../bench/auth.mjs';

const VIEW = 2;

describe('the answers people were given', () => {
  let bench;
  let session;

  // Everything these scenarios ask about is a computed style or a piece of
  // text inside nested shadow roots, so one reader serves them all.
  const look = name =>
    session.page.evaluate(cardName => {
      const deep = (root, tag, found = []) => {
        for (const element of root.querySelectorAll('*')) {
          if (element.localName === tag) found.push(element);
          if (element.shadowRoot) deep(element.shadowRoot, tag, found);
        }
        return found;
      };

      const card = deep(document, 'mini-climate').find(
        one => (one.config && one.config.name) === cardName,
      );
      if (!card) return null;

      const root = card.shadowRoot;
      const indicators = root.querySelector('mc-indicators');
      const indicatorIcon = indicators
        ? indicators.shadowRoot.querySelector('.state__value_icon')
        : null;
      const value = indicators ? indicators.shadowRoot.querySelector('.state__value') : null;
      // The mode menu draws its icon through `ha-icon-button`, which renders
      // an `ha-svg-icon` and no `ha-icon` at all - and it is several shadow
      // roots down, where querySelector does not reach.
      const modeMenu = root.querySelector('mc-mode-menu');
      const modeIcon = modeMenu
        ? (deep(modeMenu.shadowRoot, 'ha-icon')[0] ?? deep(modeMenu.shadowRoot, 'ha-svg-icon')[0])
        : null;

      return {
        icon: !!root.querySelector('.entity__icon'),
        nameText: root.querySelector('.entity__info__name')?.textContent.trim() ?? null,
        secondary: !!root.querySelector('.entity__secondary_info'),
        toggleButton: !!root.querySelector('.toggle-button'),
        temperature: !!root.querySelector('mc-temperature'),
        targetTemperature: !!root.querySelector('mc-target-temperature'),
        indicatorIcon: indicatorIcon ? indicatorIcon.icon : null,
        indicatorIconColour: indicatorIcon ? getComputedStyle(indicatorIcon).color : null,
        indicatorText: indicators
          ? indicators.shadowRoot.textContent.replace(/\s+/g, ' ').trim()
          : null,
        valueDisplay: value ? getComputedStyle(value).display : null,
        modeIconColour: modeIcon ? getComputedStyle(modeIcon).color : null,
      };
    }, name);

  before(async () => {
    bench = await prepare();
    session = await open(bench.tokens);

    await session.page.goto(`${BASE}/${DASHBOARD}/${VIEW}`, { waitUntil: 'load' });
    await session.page.waitForSelector('mini-climate', { timeout: 60000 });
    await session.page.waitForTimeout(1500);

    const modal = await dialogs(session.page);
    assert.deepEqual(modal, [], 'something modal is covering the dashboard');
  });

  after(async () => {
    if (bench) {
      await publish(bench.tokens, 'bench/ac/action', 'cooling');
      await publish(bench.tokens, 'bench/clock', '21:47:08');
      await publish(bench.tokens, 'bench/plug/state', 'ON');
      await callService(bench.tokens, 'climate', 'set_hvac_mode', {
        entity_id: bench.ids.bench_ac,
        hvac_mode: 'off',
      });
    }
    if (session) await session.close();
  });

  it('draws a card with nothing but the temperature and its buttons (#40)', async () => {
    const card = await look(' ');

    assert.ok(card, 'the card is not on the dashboard');
    assert.equal(card.icon, false, 'hide_icon');
    assert.equal(card.nameText, '', 'name: " "');
    assert.equal(card.secondary, false, 'secondary_info.hide');
    assert.equal(card.toggleButton, false, 'toggle.hide');

    // What is left has to still be there: the answer is a smaller card, not an
    // emptier one.
    assert.equal(card.temperature, true);
    assert.equal(card.targetTemperature, true);
  });

  it('shows an indicator icon without its value (#64)', async () => {
    const card = await look('Icon only');

    assert.equal(card.valueDisplay, 'none', 'value.style did not reach the value');
    assert.equal(card.indicatorIcon, 'mdi:window-open', 'the icon template did not run');
    assert.equal(card.indicatorIconColour, 'rgb(255, 165, 0)', 'the style template did not run');

    await publish(bench.tokens, 'bench/plug/state', 'OFF');

    const closed = await until(async () => {
      const now = await look('Icon only');
      return now.indicatorIcon === 'mdi:window-closed' ? now : null;
    });
    assert.equal(closed.valueDisplay, 'none', 'the value came back with the new state');

    await publish(bench.tokens, 'bench/plug/state', 'ON');
  });

  it('shortens a value with a mapper (#57)', async () => {
    const first = await until(async () => {
      const now = await look('Shortened value');
      return now.indicatorText && now.indicatorText.includes('21:47') ? now : null;
    });
    assert.ok(!first.indicatorText.includes('21:47:08'), first.indicatorText);

    // Again on a value that arrives later, so the mapper is shown to run per
    // value rather than once at setConfig.
    await publish(bench.tokens, 'bench/clock', '07:05:59');

    const second = await until(async () => {
      const now = await look('Shortened value');
      return now.indicatorText && now.indicatorText.includes('07:05') ? now : null;
    });
    assert.ok(!second.indicatorText.includes('07:05:59'), second.indicatorText);
  });

  it('colours the mode icon by what the unit is doing (#62, #129)', async () => {
    await publish(bench.tokens, 'bench/ac/action', 'cooling');

    const cooling = await until(async () => {
      const now = await look('Mode icon by action');
      return now.modeIconColour === 'rgb(0, 0, 255)' ? now : null;
    });
    assert.equal(cooling.modeIconColour, 'rgb(0, 0, 255)');

    await publish(bench.tokens, 'bench/ac/action', 'heating');

    const heating = await until(async () => {
      const now = await look('Mode icon by action');
      return now.modeIconColour === 'rgb(255, 0, 0)' ? now : null;
    });
    assert.equal(heating.modeIconColour, 'rgb(255, 0, 0)');
  });

  it('colours an indicator by the mode of the climate entity (#168)', async () => {
    // The third argument a style template is called with is the climate
    // entity. That is what the thread never established: the answers there
    // reach for `entity.attributes`, which is the indicator's own entity, and
    // for an indicator reading a sensor that is not the climate at all.
    const before_ = await look('Indicator by mode');
    assert.equal(before_.indicatorIconColour, 'rgb(255, 0, 0)');

    await callService(bench.tokens, 'climate', 'set_hvac_mode', {
      entity_id: bench.ids.bench_ac,
      hvac_mode: 'cool',
    });

    const cooling = await until(async () => {
      const now = await look('Indicator by mode');
      return now.indicatorIconColour === 'rgb(0, 0, 255)' ? now : null;
    });
    assert.equal(cooling.indicatorIconColour, 'rgb(0, 0, 255)');
  });
});
