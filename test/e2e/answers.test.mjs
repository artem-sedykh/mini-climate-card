// The answers this tracker gives, as tests.
//
// Every card in the third view of the manifest is an answer someone was given
// to a question: how to draw a card with nothing but the temperature (#40),
// how to show an indicator's icon without its value (#64), how to shorten a
// value (#57), how to colour the mode icon by the mode and by what the unit is
// doing (#62, #129), how to colour the entity icon from hvac_action (#38, #42),
// how to colour an indicator by the mode (#168), how to
// press the mode instead of picking it out of a list (#160), and why a
// button's own colour needs `!important`.
//
// They are here rather than only in a reply because an answer that lives in a
// comment is one nobody notices breaking. Each of these was asked more than
// once, over years.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { callService, dialogs, entity, open, publish, until } from '../bench/browser.mjs';
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

      const allValues = indicators
        ? [...indicators.shadowRoot.querySelectorAll('.state__value')].map(node =>
            node.textContent.trim(),
          )
        : [];

      return {
        icon: !!root.querySelector('.entity__icon'),
        indicatorValues: allValues,
        entityIcon: root.querySelector('.entity__icon ha-icon')?.icon ?? null,
        // The wrap's `color` is not the glyph: `--icon-primary-color` paints
        // `ha-svg-icon` and leaves the wrap reporting the template's colour
        // (#162, #287). The bench is the layer that has a real `ha-icon`.
        entityIconGlyphColour: (() => {
          const icon = root.querySelector('.entity__icon ha-icon');
          if (!icon?.shadowRoot) return null;
          const svg =
            icon.shadowRoot.querySelector('svg') ??
            icon.shadowRoot.querySelector('ha-svg-icon')?.shadowRoot?.querySelector('svg');
          if (!svg) return null;
          const fill = getComputedStyle(svg).fill;
          if (fill && fill !== 'none') return fill;
          const path = svg.querySelector('path');
          return path ? getComputedStyle(path).fill : fill;
        })(),
        entityIconActive: root.querySelector('.entity__icon')?.hasAttribute('color') ?? false,
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
        // The dropdown a recipe may replace, and the icon of the button that
        // took its place. `mc-button` draws its `ha-icon` inside its own root,
        // so it is not reachable from here without the walk either.
        modeMenu: !!modeMenu,
        // What the control row holds, in order - the row `location: main`
        // moves a button into.
        rowTags: [...(root.querySelector('.ctl-wrap')?.children ?? [])].map(
          element => element.localName,
        ),
        buttonIcon: (() => {
          const button = root.querySelector('mc-button');
          if (!button) return null;
          const icon = deep(button.shadowRoot, 'ha-icon')[0];
          return icon ? icon.icon : null;
        })(),
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
      await callService(bench.tokens, 'climate', 'set_preset_mode', {
        entity_id: bench.ids.bench_ac,
        preset_mode: 'none',
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

  it('colours the mode icon by the mode (#62, #129)', async () => {
    // The unit is switched on for both halves, and that is the whole point.
    // `hvac_mode` defaults its `active` to `climate.isOn` (src/main.ts), which
    // puts the `color` attribute on the `ha-icon-button`, and sharedStyle
    // colours that attribute `!important`. So on a running unit an inline
    // style without `!important` of its own loses, and the documented answer
    // carries one.
    //
    // The version this one replaces drove `hvac_action` on a unit that was
    // never switched on: no `color` attribute, no competing rule, and an
    // answer that did not work for anybody whose air conditioner was
    // actually running.
    await callService(bench.tokens, 'climate', 'set_hvac_mode', {
      entity_id: bench.ids.bench_ac,
      hvac_mode: 'cool',
    });

    const cooling = await until(async () => {
      const now = await look('Mode icon by state');
      return now.modeIconColour === 'rgb(0, 0, 255)' ? now : null;
    });
    assert.equal(cooling.modeIconColour, 'rgb(0, 0, 255)');

    await callService(bench.tokens, 'climate', 'set_hvac_mode', {
      entity_id: bench.ids.bench_ac,
      hvac_mode: 'heat',
    });

    const heating = await until(async () => {
      const now = await look('Mode icon by state');
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

  it('colours the mode icon by what the unit is doing (#62, #129)', async () => {
    // The other half of the same answer: `hvac_action` is what the unit is
    // doing, the mode is what it was asked to do, and a style template gets
    // the entity so it can read either. The mode is left alone here and only
    // the action moves, which is what tells the two apart.
    //
    // Last in the file on purpose: it needs the unit switched on, for the
    // `!important` reason above, and the scenario before it asserts on a unit
    // that is not cooling yet.
    await callService(bench.tokens, 'climate', 'set_hvac_mode', {
      entity_id: bench.ids.bench_ac,
      hvac_mode: 'cool',
    });
    await publish(bench.tokens, 'bench/ac/action', 'cooling');

    const cooling_ = await until(async () => {
      const now = await look('Mode icon by action');
      return now.modeIconColour === 'rgb(0, 0, 255)' ? now : null;
    });
    assert.equal(cooling_.modeIconColour, 'rgb(0, 0, 255)');

    await publish(bench.tokens, 'bench/ac/action', 'heating');

    const heating = await until(async () => {
      const now = await look('Mode icon by action');
      return now.modeIconColour === 'rgb(255, 0, 0)' ? now : null;
    });
    assert.equal(heating.modeIconColour, 'rgb(255, 0, 0)');
  });

  it('picks the entity icon from hvac_action (#38, #42)', async () => {
    // The left icon is the one that could not follow state: a string, tinted
    // by HVAC mode. A zigbee2mqtt thermostat stays in `heat`, so without a
    // template it looks on while idle. Style owns the colour (no `color`
    // attribute) so the two halves can disagree with the mode.
    await callService(bench.tokens, 'climate', 'set_hvac_mode', {
      entity_id: bench.ids.bench_ac,
      hvac_mode: 'heat',
    });
    await publish(bench.tokens, 'bench/ac/action', 'heating');

    const heating = await until(async () => {
      const now = await look('Entity icon by action');
      return now &&
        now.entityIcon === 'mdi:radiator' &&
        now.entityIconGlyphColour === 'rgb(255, 0, 0)'
        ? now
        : null;
    });
    assert.equal(heating.entityIcon, 'mdi:radiator');
    assert.equal(heating.entityIconGlyphColour, 'rgb(255, 0, 0)');
    assert.equal(heating.entityIconActive, false, 'style owns the colour; isActive must not tint');

    await publish(bench.tokens, 'bench/ac/action', 'idle');

    const idle = await until(async () => {
      const now = await look('Entity icon by action');
      return now &&
        now.entityIcon === 'mdi:radiator-off' &&
        now.entityIconGlyphColour === 'rgb(128, 128, 128)'
        ? now
        : null;
    });
    assert.equal(idle.entityIcon, 'mdi:radiator-off');
    assert.equal(idle.entityIconGlyphColour, 'rgb(128, 128, 128)');
    assert.equal(idle.entityIconActive, false);
  });

  it('leaves a text state alone when round is set (#298)', async () => {
    // Two indicators on the same sensor, whose state is a clock: one with
    // `round: 1` and one without. They have to read the same.
    //
    // They did not. The guard was `Number.isNaN(value) === false`, which does
    // not coerce, so the string reached `round()` and the card drew the text
    // `NaN` - which is what every indicator with `round` did for as long as
    // its sensor was unavailable.
    await publish(bench.tokens, 'bench/clock', '12:34:56');

    const seen = await until(
      async () => {
        const now = await look('Text state with round');
        return now && now.indicatorValues[0] === '12:34:56' ? now : null;
      },
      {
        timeout: 30000,
        diagnose: async () => (await look('Text state with round'))?.indicatorValues ?? null,
      },
    );

    assert.deepEqual(seen.indicatorValues, ['12:34:56', '12:34:56']);
  });

  it('lets a button style beat the active colour with !important', async () => {
    // sharedStyle paints `ha-icon-button[color]` `color` and `opacity`
    // `!important`, and `button.ts` puts that attribute on while the button is
    // on - the same moment a style written for the `on` state applies. So
    // `color` from a template needs an `!important` of its own and every other
    // property does not, which is what the two assertions here are: the
    // template's blue against the accent it would otherwise keep, and the
    // template's background, which never needed one.
    await callService(bench.tokens, 'climate', 'set_preset_mode', {
      entity_id: bench.ids.bench_ac,
      preset_mode: 'eco',
    });

    const card = session.page.locator('mini-climate').filter({ hasText: 'Button colour' });
    await card.locator('.toggle-button').first().click();
    await card.locator('mc-button').first().waitFor({ state: 'visible' });

    const button = card.locator('mc-button ha-icon-button').first();
    const seen = await until(async () => {
      const now = await button.evaluate(element => {
        const style = getComputedStyle(element);
        return {
          colour: style.color,
          background: style.backgroundColor,
          active: element.hasAttribute('color'),
        };
      });
      return now.active && now.colour === 'rgb(0, 0, 255)' ? now : null;
    });

    assert.equal(seen.colour, 'rgb(0, 0, 255)', 'the template colour lost to the active rule');
    assert.equal(seen.background, 'rgb(0, 128, 0)');
  });

  it('toggles the mode from a button standing where the dropdown was (#160)', async () => {
    // `hvac_mode` is drawn as a dropdown and nothing else - `main.ts` renders
    // `mc-mode-menu` whatever `type` says - so a unit with two modes gets a
    // list of two to pick from where a press would do. The answer is not the
    // dropdown at all: hide it, and put an ordinary button in its place with
    // `location: main`, which is the row the dropdown was in.
    //
    // Both halves are asserted here, and the entity as well as the icon: a
    // button that repaints itself without the service call landing is exactly
    // what `mc-button` does on its own for the length of `action_timeout`.
    await callService(bench.tokens, 'climate', 'set_hvac_mode', {
      entity_id: bench.ids.bench_ac,
      hvac_mode: 'off',
    });

    const off = await until(async () => {
      const now = await look('Mode toggle');
      return now && now.buttonIcon === 'mdi:power' ? now : null;
    });
    assert.equal(off.modeMenu, false, 'hvac_mode.hide left the dropdown on the card');

    const card = session.page.locator('mini-climate').filter({ hasText: 'Mode toggle' });
    const button = card.locator('mc-button ha-icon-button').first();

    await button.click();

    const heating = await until(async () => {
      const now = await look('Mode toggle');
      return now && now.buttonIcon === 'mdi:fire' ? now : null;
    });
    assert.equal(heating.modeMenu, false);
    assert.equal((await entity(bench.tokens, bench.ids.bench_ac)).state, 'heat');

    // And back: the same press has to mean the other thing when the state is
    // the other one, which a `toggle_action` reading `state` is the only
    // reason it does.
    await button.click();

    await until(async () => {
      const now = await look('Mode toggle');
      return now && now.buttonIcon === 'mdi:power' ? now : null;
    });
    assert.equal((await entity(bench.tokens, bench.ids.bench_ac)).state, 'off');
  });

  it('puts the hvac mode in the secondary line, as a dropdown (#194)', async () => {
    // The request was for an `hvac-mode-dropdown` type beside the
    // `fan-mode-dropdown` one. No new type is needed: `fan_mode` is a button
    // like any other, so pointing its `state` at the entity itself, its
    // `source` at the modes and its `change_action` at `set_hvac_mode` gives
    // that line the mode - with its name, and pressable, which is what the
    // control row's icon-only dropdown does not offer.
    //
    // The scenario is here rather than in the answer alone because the answer
    // is a configuration, and a configuration that stops working is exactly
    // what nobody notices.
    const card = session.page.locator('mini-climate').filter({ hasText: 'Mode under the name' });

    const line = () =>
      card.evaluate(node => {
        const fan = node.shadowRoot
          .querySelector('mc-secondary-info')
          ?.shadowRoot.querySelector('mc-fan-mode-secondary');

        return {
          label: fan?.shadowRoot.querySelector('.name')?.textContent.trim() ?? null,
          icon: fan?.shadowRoot.querySelector('ha-icon')?.icon ?? null,
          // The whole drop is the button, not the icon alone (#270).
          pressable: !!fan?.shadowRoot.querySelector('.mc-dropdown__button'),
        };
      });

    await callService(bench.tokens, 'climate', 'set_hvac_mode', {
      entity_id: bench.ids.bench_ac,
      hvac_mode: 'off',
    });

    const before_ = await until(async () => {
      const now = await line();
      return now.label === 'Off' ? now : null;
    });
    assert.equal(before_.icon, 'mdi:thermostat');
    assert.equal(before_.pressable, true);
    // And the control row's own dropdown is gone: the card shows the mode
    // once, where the answer put it.
    assert.equal((await look('Mode under the name')).modeMenu, false);

    // Pick another mode from that line, and let the entity answer for it: a
    // `change_action` written to the signature the tables used to document
    // sends the call without an `entity_id`, which Home Assistant refuses and
    // the dashboard does not show at all - the console carries it and nothing
    // else does.
    await card.evaluate(node => {
      const fan = node.shadowRoot
        .querySelector('mc-secondary-info')
        .shadowRoot.querySelector('mc-fan-mode-secondary');
      fan.shadowRoot.querySelector('.mc-dropdown__button').click();
    });

    await until(async () => {
      const picked = await card.evaluate(node => {
        const fan = node.shadowRoot
          .querySelector('mc-secondary-info')
          .shadowRoot.querySelector('mc-fan-mode-secondary');
        const menu = fan.shadowRoot.querySelector('mc-menu');
        const item = menu?.shadowRoot.querySelector('[data-value="cool"]');
        if (!item) return false;
        item.click();
        return true;
      });
      return picked || null;
    });

    const state = await until(async () => {
      const now = await entity(bench.tokens, bench.ids.bench_ac);
      return now.state === 'cool' ? now.state : null;
    });
    assert.equal(state, 'cool');

    const after_ = await until(async () => {
      const now = await line();
      return now.label === 'Cool' ? now : null;
    });
    assert.equal(after_.label, 'Cool');
  });

  it('moves the fan mode dropdown into the control row, working (location)', async () => {
    // `fan_mode` is pushed into `config.buttons` under that id, so the option
    // that moves a button moves it too - and it arrives as a dropdown, which
    // is the half worth doing here rather than in the browser layer: the menu
    // is put in the top layer by `showPopover`, and a card that clips its own
    // overflow is what it has to escape.
    const card = session.page.locator('mini-climate').filter({ hasText: 'Fan in the top row' });

    const row = await look('Fan in the top row');
    assert.deepEqual(row.rowTags, ['mc-dropdown', 'mc-mode-menu', 'mc-temperature']);

    const dropdown = card.locator('mc-dropdown').first();

    await dropdown.evaluate(node => {
      node.shadowRoot.querySelector('mc-dropdown-base').shadowRoot.getElementById('button').click();
    });

    // Polled rather than read after a fixed wait (#304). The menu opens over a
    // render and a `showPopover`, and on a loaded runner that took longer than
    // the 400ms this used to allow - once, in CI, on a commit that changed a
    // markdown file. A red run of a scenario nobody touched reads as a broken
    // branch, which is the expensive part of a flake rather than the rerun.
    const menuOpen = () =>
      dropdown.evaluate(
        node =>
          node.shadowRoot.querySelector('mc-dropdown-base').shadowRoot.getElementById('menu').open,
      );

    const opened = await until(async () => (await menuOpen()) || null, {
      diagnose: async () => ({
        open: await menuOpen(),
        items: await session.page.locator('.mc-menu__item__label').allTextContents(),
      }),
    });
    assert.equal(opened, true, 'the menu did not open from the control row');

    await dropdown.evaluate(node => {
      node.shadowRoot
        .querySelector('mc-dropdown-base')
        .shadowRoot.getElementById('menu')
        .shadowRoot.querySelector('[data-value="high"]')
        .click();
    });

    const set = await until(async () => {
      const now = await entity(bench.tokens, bench.ids.bench_ac);
      return now.attributes.fan_mode === 'high' ? now : null;
    });
    assert.equal(set.attributes.fan_mode, 'high');

    await callService(bench.tokens, 'climate', 'set_fan_mode', {
      entity_id: bench.ids.bench_ac,
      fan_mode: 'auto',
    });
  });
});
