// The visual editor, opened the way Home Assistant opens it. The card
// advertises `configurable: true`, and on a dashboard in edit mode the card's
// "Edit" control mounts the element `getConfigElement()` returns. Without that
// wiring Home Assistant shows a YAML editor with "visual editor not supported";
// here the point is which element it actually mounts.
//
// The editor is drawn with `ha-form`/`ha-expansion-panel`, which only exist
// inside a running Home Assistant - the browser layer cannot render them. The
// card itself sits several shadow roots down (hui-view > ... > hui-card >
// mini-climate), so this walks the trees rather than querying the document.
//
// The dashboard is a throwaway one, created in the scenario and deleted after
// (see .claude/rules/ha-live-testing.md). The bench owns the fixed manifest
// dashboard, and leaving this in it would mutate what the other scenarios run.
//
// Needs a bench: `npm run bench:up`, or BENCH_URL pointing at one.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { open, until } from '../bench/browser.mjs';
import { connect } from '../bench/ws.mjs';
import { prepare } from '../bench/setup.mjs';
import { BASE } from '../bench/auth.mjs';

const URL_PATH = 'e2e-editor-probe';
const DASHBOARD_ID = 'e2e_editor_probe';

describe('the visual editor a person opens', () => {
  let bench;
  let session;
  let ws;

  before(async () => {
    bench = await prepare();
    session = await open(bench.tokens);
    ws = await connect(BASE, bench.tokens.access_token);

    // A probe dashboard of our own, so the edit-mode path is exercised against
    // a board whose config is not the bench's fixed one. The card points at a
    // real bench entity, so the dialog opens with a configuration that means
    // something.
    await ws.send({
      type: 'lovelace/dashboards/create',
      url_path: URL_PATH,
      title: 'e2e editor probe',
      require_admin: true,
      show_in_sidebar: false,
    });
    await ws.send({
      type: 'lovelace/config/save',
      url_path: URL_PATH,
      config: {
        views: [{ cards: [{ type: 'custom:mini-climate', entity: bench.ids.bench_ac }] }],
      },
    });

    await session.page.goto(`${BASE}/${URL_PATH}/0?edit=1`, { waitUntil: 'load' });
    await session.page.waitForSelector('mini-climate', { timeout: 60000 });
    await session.page.waitForTimeout(1500);
  });

  after(async () => {
    if (ws) {
      await ws.send({ type: 'lovelace/dashboards/delete', dashboard_id: DASHBOARD_ID });
      ws.close();
    }
    if (session) await session.close();
  });

  it('opens the visual editor, not the YAML fallback', async () => {
    // The card's own edit control in the view's edit mode. The bench pins the
    // frontend language to en in `open()`, so the label is the English one.
    await session.page.getByRole('button', { name: 'Edit', exact: true }).first().click();

    // The element Home Assistant mounts for the card editor. It comes out of
    // `getConfigElement()`, so its presence says the picker used the visual
    // editor; a card that does not expose the method mounts no such element and
    // shows the YAML fallback instead.
    const mounted = await until(async () => {
      const found = await session.page.evaluate(() => {
        // The card editor sits inside a dialog in the frontend's own shadow
        // trees, so a document query never sees it.
        const findDeep = (root, tag) => {
          const walk = node => {
            for (const el of node.querySelectorAll('*')) {
              if (el.localName === tag) return el;
              if (el.shadowRoot) {
                const hit = walk(el.shadowRoot);
                if (hit) return hit;
              }
            }
            return null;
          };
          return walk(root);
        };

        const editor = findDeep(document, 'hui-card-element-editor');
        const configEl = editor && editor._configElement;
        if (!configEl) return null;
        const root = configEl.shadowRoot || configEl;
        return {
          tag: configEl.tagName,
          hasForm: !!root.querySelector('ha-form'),
          sections: root.querySelectorAll('ha-expansion-panel').length,
        };
      });
      return found ? found : null;
    });

    assert.equal(mounted.tag, 'MINI-CLIMATE-EDITOR');
    assert.equal(mounted.hasForm, true);
    assert.equal(mounted.sections, 7);
  });
});
