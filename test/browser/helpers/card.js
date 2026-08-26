import { fixture, nextFrame } from '@open-wc/testing';
import { defineHaElements } from './ha-elements.js';
import { createHass, ENTITY_ID } from './hass.js';
import '../../../src/main';

// The card as Home Assistant builds it: `setConfig` with the YAML, then
// `hass`, then into the document. The order matters - the `hass` setter reads
// `config.entity`, and it is what builds every model the render needs.
export const mountCard = async ({ config = {}, ...state } = {}) => {
  defineHaElements();

  const hass = createHass(state);
  const element = document.createElement('mini-climate');

  element.setConfig({ entity: ENTITY_ID, ...config });
  element.hass = hass;

  const card = await fixture(element);
  await card.updateComplete;
  await nextFrame();

  return { card, hass };
};

// Every `mc-*` element the card has rendered, wherever it sits in the nested
// shadow roots.
export const components = root => {
  const found = [];
  const walk = node => {
    for (const child of node.querySelectorAll('*')) {
      if (child.localName.startsWith('mc-')) found.push(child);
      if (child.shadowRoot) walk(child.shadowRoot);
    }
  };

  walk(root.shadowRoot || root);
  return found;
};

// Everything the card and its components scheduled has finished: the card's
// own update, and the updates its render started in the components below it.
export const settle = async card => {
  await card.updateComplete;
  await nextFrame();
};

// Counts render passes per element, by shadowing `render` on the instance.
//
// The alternative is `await el.updateComplete`, which lit resolves to `false`
// when an update was requested from inside the update cycle. That reads well,
// but it answers only for the cycle running at the moment it is asked, and by
// the time a walk of the shadow trees reaches a component two levels down,
// that component's cycle - second pass and all - is over. A counter does not
// care when it is read.
export const countRenders = elements => {
  const counts = new Map();

  for (const element of elements) {
    counts.set(element, 0);
    const render = element.render.bind(element);

    element.render = () => {
      counts.set(element, counts.get(element) + 1);
      return render();
    };
  }

  return counts;
};
