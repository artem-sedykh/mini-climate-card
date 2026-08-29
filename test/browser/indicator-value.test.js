// What an indicator's value looks like once it is in the DOM.
//
// The model answers what the value *is*; this file answers what a person
// reading the card sees, which is not the same question when the value is a
// number that formats away its own decimals (#163) or a state that arithmetic
// cannot be done on (#298). Assertions are on strings: a DOM node in a
// failure report hangs the runner.
import { expect } from '@open-wc/testing';
import { mountCard } from './helpers/card.js';

const values = card => {
  const indicators = card.shadowRoot.querySelector('mc-indicators');
  return [...indicators.shadowRoot.querySelectorAll('.state__value')].map(node =>
    node.textContent.trim(),
  );
};

const power = extra => ({ source: { entity: 'sensor.bedroom_power' }, ...extra });
const offline = extra => ({ source: { entity: 'sensor.bedroom_offline' }, ...extra });

describe('an indicator value in the DOM', () => {
  it('keeps the decimal place with fixed, and drops it with round', async () => {
    // #163: the reason the two options are not the same. A column of these in
    // a vertical stack lines up only if the width does not depend on the
    // reading.
    const { card } = await mountCard({
      config: {
        indicators: {
          fixed: power({ fixed: 1 }),
          rounded: power({ round: 1 }),
        },
      },
    });

    expect(values(card)).to.deep.equal(['850.0', '850']);
  });

  it('draws an unavailable sensor as unavailable, not as NaN', async () => {
    // #298. The guard read `Number.isNaN(value) === false`, which does not
    // coerce, so the string went to round() and came back NaN - and the card
    // interpolates the value straight into the span, so NaN is what was drawn.
    const { card } = await mountCard({
      config: {
        indicators: {
          rounded: offline({ round: 1 }),
          fixed: offline({ fixed: 1 }),
          bare: offline({}),
        },
      },
    });

    expect(values(card)).to.deep.equal(['unavailable', 'unavailable', 'unavailable']);
  });
});
