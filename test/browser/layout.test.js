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

describe('the layout under a name that does not fit', () => {
  // A name long enough that something has to give, which is the situation the
  // card measures itself for: `--mc-card-width` feeds a `max-width` on the
  // name so that the controls beside it keep their room.
  const config = { name: 'The air conditioner in the bedroom on the second floor' };

  it('never lets the card scroll sideways', async () => {
    const { card } = await mountCard({ config });

    for (const width of [300, 400, 500]) {
      const measured = await widths(card, width);
      expect(measured.overflows, `${width}px`).to.be.false;
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

  // Worth knowing while #222 is open: the controls are not immune either. At
  // 300px this configuration measures them at 67px against 117px at 500px -
  // the name's own `min-width` outbids the cap, and `mc-temperature` carries
  // `min-width: 0`, so the readout is what gives way next. Not asserted,
  // because it is a consequence of the current numbers rather than a promise
  // the card makes.

  it('gives the name a cap that comes from the card width', async () => {
    const { card } = await mountCard({ config });

    await widths(card, 400);

    // The mechanism itself, so that its removal is a decision rather than an
    // accident: the observer writes the card's width into a custom property,
    // and the stylesheet reads it.
    const value = getComputedStyle(card.shadowRoot.querySelector('ha-card')).getPropertyValue(
      '--mc-card-width',
    );

    expect(value.trim()).to.equal('400px');
  });
});
