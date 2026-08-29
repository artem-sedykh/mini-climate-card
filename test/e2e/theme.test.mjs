// The answer to #164: what makes the card's background translucent, and why
// the obvious way of doing it changes nothing.
//
// The card does not paint its background on `ha-card`. It paints it on a layer
// of its own - `.mc__bg` in src/style.ts - stretched over the whole card, and
// leaves `ha-card` transparent. So `ha-card { background: ... }`, which is what
// the reporter reached for and what works on every other card, applies and is
// then covered up. The variable the layer reads is `--ha-card-background`.
//
// The variables are set here through a Home Assistant theme, which is the
// native way and the only one this bench can exercise: `card_mod`, which is how
// most reporters set them for a single card, is a third-party resource the
// bench deliberately does not carry.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dialogs, open, until } from '../bench/browser.mjs';
import { DASHBOARD, prepare } from '../bench/setup.mjs';
import { BASE } from '../bench/auth.mjs';

const VIEW = 4;

describe('a translucent card (#164)', () => {
  let bench;
  let session;
  let card;

  before(async () => {
    bench = await prepare();
    session = await open(bench.tokens);

    await session.page.goto(`${BASE}/${DASHBOARD}/${VIEW}`, { waitUntil: 'load' });
    await session.page.waitForSelector('mini-climate', { timeout: 60000 });
    await session.page.waitForTimeout(1500);

    const modal = await dialogs(session.page);
    assert.deepEqual(modal, [], 'something modal is covering the dashboard');

    card = session.page.locator('mini-climate').nth(0);
  });

  after(async () => {
    if (session) await session.close();
  });

  it('paints the theme background on the layer that is visible', async () => {
    const painted = await card.evaluate(element => {
      const layer = element.shadowRoot.querySelector('.mc__bg');
      const style = getComputedStyle(layer);

      return {
        background: style.backgroundColor,
        opacity: style.opacity,
        radius: style.borderRadius,
        borderWidth: style.borderWidth,
        shadow: style.boxShadow,
      };
    });

    // The alpha is the whole request: a background that lets the dashboard
    // through rather than a darker opaque one.
    assert.equal(painted.background, 'rgba(0, 0, 0, 0.5)', '--ha-card-background');
    assert.equal(painted.opacity, '1', '--mini-climate-background-opacity is a second knob');
    assert.equal(painted.radius, '10px', '--ha-card-border-radius');
    assert.equal(painted.borderWidth, '0px', '--ha-card-border-width');
    assert.equal(painted.shadow, 'none', '--mini-climate-card-box-shadow');
  });

  it('leaves ha-card transparent, under a layer that covers it', async () => {
    const layout = await card.evaluate(element => {
      const root = element.shadowRoot;
      const haCard = root.querySelector('ha-card');
      const layer = root.querySelector('.mc__bg');
      const card_ = haCard.getBoundingClientRect();
      const over = layer.getBoundingClientRect();

      return {
        haCardBackground: getComputedStyle(haCard).backgroundColor,
        position: getComputedStyle(layer).position,
        // Rounded, because a fractional layout is not what is being asked
        // about here - whether the layer covers the card is.
        covers:
          Math.round(over.top) <= Math.round(card_.top) &&
          Math.round(over.left) <= Math.round(card_.left) &&
          Math.round(over.right) >= Math.round(card_.right) &&
          Math.round(over.bottom) >= Math.round(card_.bottom),
      };
    });

    assert.equal(layout.haCardBackground, 'rgba(0, 0, 0, 0)', 'ha-card is transparent by design');
    assert.equal(layout.position, 'absolute');
    assert.equal(layout.covers, true, '.mc__bg does not cover ha-card');
  });

  it('keeps its face when ha-card is given a background of its own', async () => {
    // The claim the documentation makes, measured rather than reasoned about:
    // the rule the reporter wrote applies, and the face of the card does not
    // change. On the **default** theme, which is the situation they were in -
    // over a translucent layer the same rule does show through, tinting the
    // card, which is a different answer and not the one they were after.
    await session.page.goto(`${BASE}/${DASHBOARD}/0`, { waitUntil: 'load' });
    await session.page.waitForSelector('mini-climate', { timeout: 60000 });
    await session.page.waitForTimeout(1500);
    card = session.page.locator('mini-climate').nth(0);

    // The face rather than the whole element: `ha-card` is a hair larger than
    // the layer over it, so a colour on it does show as a rim at the very
    // edge. That rim is not what anybody means by the background of a card,
    // and inset pixels are what the answer is about.
    const box = await card.boundingBox();
    const clip = {
      x: box.x + 10,
      y: box.y + 10,
      width: box.width - 20,
      height: box.height - 20,
    };
    const face = () => session.page.screenshot({ clip });

    const before_ = await face();
    const again = await face();
    assert.ok(before_.equals(again), 'the card does not render the same twice; read no further');

    await card.evaluate(element => {
      const style = document.createElement('style');
      style.id = 'ha-card-background-attempt';
      style.textContent = 'ha-card { background: rgb(255, 0, 0) !important; }';
      element.shadowRoot.appendChild(style);
    });
    // A stylesheet appended to a shadow root is not in effect by the end of the
    // task that appended it, and `ha-card` transitions its background rather
    // than swapping it - read too early and the answer is a colour part way
    // there, which is a measurement of nothing. Waited out rather than slept
    // through: what is being established is that it applied at all.
    const applied = await until(async () => {
      const colour = await card.evaluate(
        element => getComputedStyle(element.shadowRoot.querySelector('ha-card')).backgroundColor,
      );
      return colour === 'rgb(255, 0, 0)' ? colour : null;
    });

    // It applied. That is the point: the reporter's CSS was never the problem.
    assert.equal(applied, 'rgb(255, 0, 0)');

    const after_ = await face();
    assert.ok(after_.equals(before_), 'ha-card background reached the face of the card after all');

    // The control. "Nothing changed" is only worth reading if the same
    // measurement can see a change at all - so the variable the documentation
    // points at is set on the same card, through the same clip, and has to
    // move the pixels the rule above did not.
    await card.evaluate(element => {
      element.shadowRoot.getElementById('ha-card-background-attempt')?.remove();
      element.style.setProperty('--ha-card-background', 'rgb(255, 0, 0)');
    });
    await session.page.waitForTimeout(500);

    const control = await face();
    assert.ok(!control.equals(before_), '--ha-card-background did not reach the card either');

    await card.evaluate(element => element.style.removeProperty('--ha-card-background'));
  });
});
