// The fourth layer: the card on a real dashboard, in a real Home Assistant,
// against real ha-* elements. What it is for is the failure the layers below
// cannot see - the ones where Home Assistant changed rather than the card.
// #188 (the entity icon, after ha-icon-button was rebuilt on ha-button) and
// #175 (the dropdowns, after mwc went) both looked like this and both passed
// every test in this repository while they were broken.
//
// It is deliberately thin. Geometry in pixels belongs in test/browser/, which
// is faster, deterministic and needs no container. What belongs here is what
// only a whole Home Assistant can answer.
//
// Needs a bench: `npm run bench:up`, or BENCH_URL pointing at one.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { cards, dialogs, entity, open } from '../bench/browser.mjs';
import { DASHBOARD, prepare } from '../bench/setup.mjs';
import { BASE } from '../bench/auth.mjs';

const SHOTS = 'test/e2e/shots';

describe('the card on a dashboard', () => {
  let bench;
  let session;

  before(async () => {
    await mkdir(SHOTS, { recursive: true });
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
    if (session) await session.close();
  });

  it('renders every card the manifest asks for', async () => {
    const rendered = await cards(session.page, 'mini-climate');
    // The first view only: this scenario is looking at the page it opened, and
    // the manifest has had more than one view since the configurations people
    // actually write were added to it.
    const expected = bench.manifest.views[0].cards.length;

    assert.equal(rendered.length, expected);

    const known = new Set(Object.values(bench.ids));

    for (const card of rendered) {
      assert.ok(card.height > 0, `${card.name}: no height`);

      // A card pointed at an entity that does not exist draws the unavailable
      // label and none of the controls - that is #46, and it is asserted in
      // unavailable.test.mjs. Here it only has to not be mistaken for a card
      // that failed to render.
      if (!known.has(card.config.entity)) {
        assert.match(card.text, /Unavailable/, `${card.name}: ${card.text}`);
        continue;
      }
      assert.ok(
        card.components.includes('mc-temperature'),
        `${card.name}: ${card.components.join(', ')}`,
      );
    }
    await session.page.screenshot({ path: `${SHOTS}/dashboard.png` });
  });

  it('draws the entity icon at the size Home Assistant gives it', async () => {
    // #188: the icon button inside the card kept its own 48px while the card
    // sized the host to 30px, because Home Assistant had moved the knob from
    // --mdc-icon-button-size to --ha-icon-button-size. Nothing below this
    // layer can see it - the stub elements have no size of their own.
    const sizes = await session.page.evaluate(() => {
      const found = [];

      // The `button` at the bottom, not the `ha-button` wrapping it. The
      // wrapper is an inline box, so its height is the line height - 22.4px
      // at the frontend's 14px font - whenever the button is smaller than
      // that. Measuring the wrapper reports an overflow for every button
      // under ~22px that is drawn perfectly correctly.
      const button = element => {
        let node = element.shadowRoot;
        for (let depth = 0; node && depth < 4; depth += 1) {
          const hit = node.querySelector('button');
          if (hit) return hit;
          node = node.firstElementChild?.shadowRoot;
        }
        return null;
      };

      const walk = root => {
        for (const element of root.querySelectorAll('*')) {
          if (element.localName === 'ha-icon-button') {
            const box = element.getBoundingClientRect();
            const inner = button(element)?.getBoundingClientRect();
            found.push({
              host: [+box.width.toFixed(1), +box.height.toFixed(1)],
              inner: inner ? [+inner.width.toFixed(1), +inner.height.toFixed(1)] : null,
            });
          }
          if (element.shadowRoot) walk(element.shadowRoot);
        }
      };
      walk(document);
      return found;
    });

    assert.ok(sizes.length > 0, 'no ha-icon-button rendered');

    for (const { host, inner } of sizes) {
      if (!inner) continue;
      assert.ok(
        inner[0] <= host[0] + 0.5 && inner[1] <= host[1] + 0.5,
        `button overflows its host: inner ${inner} in host ${host}`,
      );
    }
  });

  it('sends a press on the target temperature through to the entity', async () => {
    const id = bench.ids.bench_ac;
    const before_ = await entity(bench.tokens, id);

    const up = session.page
      .locator('mini-climate')
      .first()
      .locator('mc-target-temperature ha-icon-button')
      .first();

    await up.click();
    await up.click();
    // The card holds a press for ACTION_TIMEOUT before it sends, so the wait
    // is part of the path under test rather than a pause for comfort.
    await session.page.waitForTimeout(3500);

    const after_ = await entity(bench.tokens, id);
    assert.equal(
      Number(after_.attributes.temperature),
      Number(before_.attributes.temperature) + 1,
      `${before_.attributes.temperature} -> ${after_.attributes.temperature}`,
    );
  });

  it('reports nothing to the console while doing it', async () => {
    assert.deepEqual(session.errors, []);
  });
});
