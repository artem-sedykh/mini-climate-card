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
