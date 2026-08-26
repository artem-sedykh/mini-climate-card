import { expect, nextFrame } from '@open-wc/testing';
import { mountCard } from './helpers/card.js';

const widths = async (card, width) => {
  card.style.display = 'block';
  card.style.width = `${width}px`;
  await nextFrame();

  const root = card.shadowRoot;
  const haCard = root.querySelector('ha-card');

  return {
    controls: +root.querySelector('.ctl-wrap').getBoundingClientRect().width.toFixed(1),
    name: +root.querySelector('.entity__info__name_wrap').getBoundingClientRect().width.toFixed(1),
    overflows: haCard.scrollWidth > haCard.clientWidth,
  };
};

// The three sets of controls the layout has to hold: the default one, one made
// wider by an extra button in the main row, and one made narrower by hiding the
// hvac mode. The old cap was two constants that assumed the first of them.
const CONTROLS = {
  default: {},
  'an extra button': { buttons: { boost: { icon: 'mdi:fire', location: 'main', type: 'button' } } },
  'no hvac mode': { hvac_mode: { hide: true } },
};

describe('the layout under a name that does not fit', () => {
  // A name long enough that something has to give. Which part gives is the
  // whole of #222: the card used to measure itself, publish the width as
  // `--mc-card-width` and cap the name with `calc((width - 191.3px) / 1.43)`.
  const config = { name: 'The air conditioner in the bedroom on the second floor' };

  it('never lets the card scroll sideways', async () => {
    for (const [controls, extra] of Object.entries(CONTROLS)) {
      const { card } = await mountCard({ config: { ...config, ...extra } });

      for (const width of [300, 400, 500]) {
        const measured = await widths(card, width);
        expect(measured.overflows, `${controls} at ${width}px`).to.be.false;
      }
    }
  });

  it('cuts the name rather than letting it push anything out of the card', async () => {
    const { card } = await mountCard({ config });

    const nameEl = card.shadowRoot.querySelector('.entity__info__name');
    const narrow = await widths(card, 300);
    const wide = await widths(card, 500);

    // The name is the part that yields as the card narrows, and what does not
    // fit is cut with an ellipsis rather than drawn past the edge.
    expect(narrow.name).to.be.lessThan(wide.name);
    expect(nameEl.scrollWidth, 'truncated').to.be.greaterThan(nameEl.clientWidth);

    const nameBox = card.shadowRoot
      .querySelector('.entity__info__name_wrap')
      .getBoundingClientRect();

    expect(nameBox.right).to.be.at.most(card.getBoundingClientRect().right);
  });

  it('leaves the controls the width they need, whatever the card is', async () => {
    // What the constants got wrong. They described the default controls at one
    // moment, so a card with any other set was squeezed at the narrow end -
    // measured here before the change at 300px: 117px of controls down to 67.
    // With an extra button the two engines did not even agree on how much
    // (121.1px in one, 135.3px in the other at 400px), because what gives way
    // then depends on the contents rather than on a rule.
    for (const [controls, extra] of Object.entries(CONTROLS)) {
      const { card } = await mountCard({ config: { ...config, ...extra } });

      const measured = [];
      for (const width of [300, 400, 500]) measured.push(await widths(card, width));

      const distinct = new Set(measured.map(m => m.controls));

      expect(distinct.size, `${controls}: ${[...distinct].join(', ')}`).to.equal(1);
      expect(measured[0].name, controls).to.be.lessThan(measured[2].name);
    }
  });

  it('gives the name the room the icon had, when the icon is hidden', async () => {
    // What #169 asked for, and what it would not have got before #222: the old
    // cap on the name had no term for the icon, so the space freed by hiding
    // it went into the gap in front of the controls instead.
    const shown = await mountCard({ config });
    const hidden = await mountCard({ config: { ...config, hide_icon: true } });

    const before = await widths(shown.card, 400);
    const after = await widths(hidden.card, 400);

    // A count rather than the element itself: an assertion that fails with a
    // DOM element as its actual value hangs the runner rather than failing,
    // so a test written that way could never report the regression it is for.
    expect(hidden.card.shadowRoot.querySelectorAll('.entity__icon').length).to.equal(0);
    expect(after.name).to.be.greaterThan(before.name);
    expect(after.controls).to.equal(before.controls);
  });

  it('does not measure itself', async () => {
    // The mechanism is gone rather than left unused: no observer, and nothing
    // published for a stylesheet to read. Asserted so that bringing either
    // back is a decision - the test it replaces asserted the opposite for the
    // same reason.
    const { card } = await mountCard({ config });

    await widths(card, 400);

    const value = getComputedStyle(card.shadowRoot.querySelector('ha-card')).getPropertyValue(
      '--mc-card-width',
    );

    expect(value.trim()).to.equal('');
  });
});

// Vertical alignment across the core row. The row is as tall as the entity
// icon, and what sits beside the icon was aligned to its edges rather than to
// its middle: the mode and the temperatures to the bottom (#99), the name to
// the top when nothing followed it (#100).
describe('what the core row lines up against', () => {
  // Middles rather than tops: the parts have different heights, so a top that
  // matches would mean they do not line up.
  const middles = async card => {
    card.style.display = 'block';
    card.style.width = '400px';
    await nextFrame();

    const root = card.shadowRoot;
    const middle = sel => {
      const el = root.querySelector(sel);
      if (!el) return null;
      const box = el.getBoundingClientRect();
      return box.top + box.height / 2;
    };

    return {
      icon: middle('.entity__icon'),
      name: middle('.entity__info__name'),
      controls: middle('.ctl-wrap'),
      secondary: middle('.entity__secondary_info'),
    };
  };

  // Half a pixel: the two engines disagree by a fraction on the height of the
  // controls, and a rule about lining up is not a rule about rounding.
  const TOLERANCE = 0.5;

  it('centres the mode and the temperatures against the entity icon', async () => {
    for (const extra of [
      {},
      { secondary_info: { hide: '() => true' } },
      { toggle: { hide: true } },
    ]) {
      const { card } = await mountCard({ config: extra });
      const at = await middles(card);

      expect(Math.abs(at.controls - at.icon), JSON.stringify(extra)).to.be.at.most(TOLERANCE);
    }
  });

  it('centres the name once the secondary info is not there', async () => {
    const { card } = await mountCard({ config: { secondary_info: { hide: '() => true' } } });
    const at = await middles(card);

    expect(at.secondary).to.equal(null);
    expect(Math.abs(at.name - at.icon)).to.be.at.most(TOLERANCE);
  });

  it('leaves the name where it was while the secondary info is there', async () => {
    // The pair fills the row together, and moving the name then would move
    // the line under it for every card that never asked for a change.
    const { card } = await mountCard();
    const at = await middles(card);

    expect(at.name).to.be.lessThan(at.icon);
    expect(at.secondary).to.be.greaterThan(at.icon);
  });

  it('centres the name on an unavailable entity too', async () => {
    // The unavailable card has no secondary info by construction, and the
    // label it draws instead sits in the same row.
    const { card } = await mountCard({ state: 'unavailable' });
    const at = await middles(card);

    expect(Math.abs(at.name - at.icon)).to.be.at.most(TOLERANCE);
  });
});
