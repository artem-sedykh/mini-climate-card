// A browser already logged in to the bench, and the two things every scenario
// needs from a page: what the card rendered, and what the entity says now.
//
// Playwright is here as a dependency of @web/test-runner-playwright, which is
// also what installs the engines - the component layer runs on them already.
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { isTransient, readPage } from './evaluate.mjs';
import { BASE, request } from './auth.mjs';

// Set by `npm run bench:coverage`. Off by default: collecting coverage means
// serving an unminified build, which is not the file that ships.
const COVERAGE = process.env.BENCH_COVERAGE === '1';
const COVERAGE_DIR = process.env.BENCH_COVERAGE_DIR || 'test/e2e/coverage';

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

  if (COVERAGE) await page.coverage.startJSCoverage({ resetOnNavigation: false });

  // Closing through here rather than through `browser` directly, so a scenario
  // does not have to know whether coverage is being collected.
  const close = async () => {
    if (COVERAGE) {
      const entries = await page.coverage.stopJSCoverage();
      const ours = entries.filter(entry => entry.url.includes('/local/bench/'));

      await mkdir(COVERAGE_DIR, { recursive: true });
      await writeFile(
        `${COVERAGE_DIR}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`,
        JSON.stringify(ours),
      );
    }
    await browser.close();
  };

  return { browser, page, errors, close };
};

/**
 * Every instance of a custom element on the page, however many shadow roots
 * down it sits. A dashboard puts a card inside hui-view inside
 * ha-panel-lovelace inside home-assistant, so a plain querySelectorAll finds
 * nothing and says so as an empty list rather than an error.
 */
export const cards = (page, tag) =>
  readPage(
    page,
    name => {
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
    },
    tag,
  );

/**
 * Anything modal that is open over the dashboard. A dialog covering the cards
 * turns every click into a 30-second timeout whose message says only that the
 * element was not stable, so this is asked before a scenario starts and the
 * failure names what is in the way.
 */
export const dialogs = page =>
  readPage(page, () => {
    const names = ['ha-dialog', 'ha-md-dialog', 'ha-more-info-dialog'];
    const open = [];

    const walk = root => {
      for (const element of root.querySelectorAll('*')) {
        if (names.includes(element.localName) && element.isConnected) {
          // `ha-more-info-dialog` is left in the document after it closes, so
          // its presence says nothing: a closed one has an empty shadow root,
          // and an open one does not. The others are measured, because a
          // dialog that is not showing has no box.
          const box = element.getBoundingClientRect();
          const showing =
            element.localName === 'ha-more-info-dialog'
              ? (element.shadowRoot?.children.length ?? 0) > 0
              : box.width > 0 && box.height > 0;

          // The tag as well as the text: a more-info dialog keeps its content
          // in a shadow root, so its `textContent` is empty and a failure
          // would otherwise report an empty string as the thing in the way.
          if (showing) {
            const text = element.textContent.replace(/\s+/g, ' ').trim().slice(0, 100);
            open.push(text ? `${element.localName}: ${text}` : element.localName);
          }
        }
        if (element.shadowRoot) walk(element.shadowRoot);
      }
    };
    walk(document);
    return open;
  });

/** A service call from outside the page - how a scenario changes what the card
 * is looking at without pressing anything. */
export const callService = (tokens, domain, service, data) =>
  request(`/api/services/${domain}/${service}`, data, tokens.access_token);

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

/** Waits for a condition the bench cannot make synchronous: MQTT, then a render.
 * `diagnose` runs only on timeout, so a flake can name the page as it was
 * rather than stopping at `last value null`. */
export const until = async (check, { timeout = 10000, step = 250, diagnose } = {}) => {
  const deadline = Date.now() + timeout;
  let last;

  for (;;) {
    try {
      last = await check();
      if (last) return last;
    } catch (error) {
      if (!isTransient(error)) throw error;
      last = null;
    }
    if (Date.now() > deadline) {
      let extra = '';
      if (diagnose) {
        try {
          const dump = await diagnose();
          extra = `\n${typeof dump === 'string' ? dump : JSON.stringify(dump)}`;
        } catch (error) {
          extra = `\ndiagnose failed: ${error && error.message}`;
        }
      }
      throw new Error(`timed out: last value ${JSON.stringify(last)}${extra}`);
    }
    await new Promise(resolve => setTimeout(resolve, step));
  }
};
