// A browser already logged in to the bench, and the two things every scenario
// needs from a page: what the card rendered, and what the entity says now.
//
// Playwright is here as a dependency of @web/test-runner-playwright, which is
// also what installs the engines - the component layer runs on them already.
import { chromium } from 'playwright';
import { BASE, request } from './auth.mjs';

export const open = async (tokens, { viewport = { width: 900, height: 700 } } = {}) => {
  const browser = await chromium.launch();
  // The locale is pinned, and so is the frontend's own language below. Without
  // both, the labels a scenario reads are whatever language the machine
  // running it prefers: the same assertion passes on a CI runner and fails on
  // a developer's laptop, saying nothing about the card either way.
  const page = await browser.newPage({ viewport, locale: 'en-US' });

  // The frontend reads its session out of localStorage, so a scenario never
  // has to type into the login form.
  await page.addInitScript(
    ([url, clientId, payload]) => {
      localStorage.setItem('hassUrl', url);
      localStorage.setItem('selectedLanguage', JSON.stringify('en'));
      localStorage.setItem(
        'hassTokens',
        JSON.stringify({ ...payload, hassUrl: url, clientId, expires: Date.now() + 1800000 }),
      );
    },
    [BASE, `${BASE}/`, tokens],
  );

  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text().slice(0, 300)}`);
  });

  return { browser, page, errors };
};

/**
 * Every instance of a custom element on the page, however many shadow roots
 * down it sits. A dashboard puts a card inside hui-view inside
 * ha-panel-lovelace inside home-assistant, so a plain querySelectorAll finds
 * nothing and says so as an empty list rather than an error.
 */
export const cards = (page, tag) =>
  page.evaluate(name => {
    const found = [];
    const walk = root => {
      for (const element of root.querySelectorAll('*')) {
        if (element.localName === name) found.push(element);
        if (element.shadowRoot) walk(element.shadowRoot);
      }
    };
    walk(document);

    return found.map(card => {
      const root = card.shadowRoot;
      const host = root.querySelector('ha-card');
      const box = host.getBoundingClientRect();

      return {
        config: card.config ? { ...card.config } : null,
        name: root.querySelector('.entity__info__name')?.textContent.trim() ?? null,
        text: host.textContent.replace(/\s+/g, ' ').trim(),
        classes: host.className.trim(),
        height: +box.height.toFixed(1),
        width: +box.width.toFixed(1),
        icon: !!root.querySelector('.entity__icon'),
        // A card that draws past its own edge, which is what an element left
        // without the thing it was positioned against tends to do.
        overflows: host.scrollWidth > host.clientWidth,
        components: [...root.querySelectorAll('*')]
          .filter(element => element.localName.startsWith('mc-'))
          .map(element => element.localName),
      };
    });
  }, tag);

export const entity = async (tokens, id) => {
  const { body } = await request(`/api/states/${id}`, undefined, tokens.access_token);
  return body;
};

/**
 * Publish to a topic the fixtures listen on - how a scenario puts an entity
 * into a state that matters: unavailable, a different action, a reading it did
 * not have.
 */
export const publish = (tokens, topic, payload) =>
  request(
    '/api/services/mqtt/publish',
    { topic, payload: String(payload), retain: true },
    tokens.access_token,
  );

/** Waits for a condition the bench cannot make synchronous: MQTT, then a render. */
export const until = async (check, { timeout = 10000, step = 250 } = {}) => {
  const deadline = Date.now() + timeout;
  let last;

  for (;;) {
    last = await check();
    if (last) return last;
    if (Date.now() > deadline) throw new Error(`timed out: last value ${JSON.stringify(last)}`);
    await new Promise(resolve => setTimeout(resolve, step));
  }
};
