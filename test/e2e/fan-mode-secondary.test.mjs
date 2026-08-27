// The fan mode dropdown under the name, as #270 reported it.
//
// The secondary info line that carries `fan-mode-dropdown` is one click
// target: press anywhere on it - on the icon or on the label - and the menu
// opens. Home Assistant 2026.8.3 used to stack the label under the icon (a
// 20x20 button holding both in a column), so only the glyph was clickable and
// the label sat below it.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { open } from '../bench/browser.mjs';
import { DASHBOARD, prepare } from '../bench/setup.mjs';
import { BASE } from '../bench/auth.mjs';

const VIEW = 3;

describe('the fan mode dropdown under the name', () => {
  let bench;
  let session;

  before(async () => {
    bench = await prepare();
    session = await open(bench.tokens);
    await session.page.goto(`${BASE}/${DASHBOARD}/${VIEW}`, { waitUntil: 'load' });
    await session.page.waitForSelector('mini-climate', { timeout: 60000 });
    await session.page.waitForTimeout(1500);
  });

  after(async () => {
    if (session) await session.close();
  });

  it('opens the menu no matter which part of the drop is pressed', async () => {
    const card = session.page.locator('mini-climate').first();
    const secondary = card.locator('mc-secondary-info');

    // The whole dropdown is the button: icon and label in one row in the
    // geometry, and one click target. That is what the two assertions settle.
    const box = await secondary.evaluate(node => {
      const fanSec = node.shadowRoot.querySelector('mc-fan-mode-secondary');
      const btn = fanSec.shadowRoot.querySelector('.mc-dropdown__button');
      const rect = btn.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      };
    });
    assert.ok(box.width > 40, `the drop should be wider than the icon grid, got ${box.width}`);

    // Press over the label (right half of the button), not the icon grid.
    await session.page.mouse.click(box.right - 2, box.top + box.height / 2);
    await session.page.waitForTimeout(400);

    const open = await secondary.evaluate(node => {
      const fanSec = node.shadowRoot.querySelector('mc-fan-mode-secondary');
      const m = fanSec.shadowRoot.querySelector('mc-menu');
      return m && m.open;
    });
    assert.equal(open, true, 'the menu should open from a press over the label');
  });

  it('keeps the icon and the label on one row', async () => {
    // #270 was layout, and only a real Home Assistant reproduces it: the
    // previous structure wrapped both in `ha-icon-button`, whose slot on
    // 2026.8.3 stacks content in a column, so the label dropped below the
    // icon. The browser layer renders a stand-in `ha-icon-button` that does
    // not stack, so it cannot catch this. Only the bench sees the real one.
    const card = session.page.locator('mini-climate').first();
    const secondary = card.locator('mc-secondary-info');

    const { iconTop, nameTop } = await secondary.evaluate(node => {
      const fanSec = node.shadowRoot.querySelector('mc-fan-mode-secondary');
      const icon = fanSec.shadowRoot.querySelector('ha-icon');
      const name = fanSec.shadowRoot.querySelector('.name');
      return {
        iconTop: icon.getBoundingClientRect().top,
        nameTop: name.getBoundingClientRect().top,
      };
    });

    // Same 20px row: within 3px reads as one line, a dropped label is a
    // whole line below (20px+).
    assert.ok(
      Math.abs(iconTop - nameTop) <= 3,
      `the label should sit beside the icon, icon top ${iconTop} label top ${nameTop}`,
    );
  });
});
