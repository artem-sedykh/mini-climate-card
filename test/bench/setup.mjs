// Brings a booted Home Assistant to the state a card scenario needs: a broker,
// the entities the manifest describes, the build under test registered as a
// resource, and a dashboard holding the cards to look at.
import { readFile } from 'node:fs/promises';
import { authenticate, BASE, request } from './auth.mjs';
import { connect } from './ws.mjs';

export const DASHBOARD = 'card-bench';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const publish = (token, topic, payload) =>
  request(
    '/api/services/mqtt/publish',
    {
      topic,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      retain: true,
    },
    token,
  );

// The broker is set up through the config flow rather than by writing a config
// entry: MQTT has had no YAML for the connection since 2022, and a hand-built
// entry is a guess about a storage format that is not ours.
const setupBroker = async token => {
  const entries = await request('/api/config/config_entries/entry', undefined, token);
  if (Array.isArray(entries.body) && entries.body.some(e => e.domain === 'mqtt')) return 'present';

  const flow = await request(
    '/api/config/config_entries/flow',
    { handler: 'mqtt', show_advanced_options: false },
    token,
  );
  // Built from the schema the step declares rather than from a fixed list of
  // keys, because that list is a fact about one Home Assistant. `protocol` and
  // the `other_settings` section arrived with a rewrite of this flow; sending
  // them to a version that predates it fails the whole run with `extra keys
  // not allowed`, before a card has been rendered at all - which is what the
  // bench looks like when it is asked about an older Home Assistant.
  //
  // `set_client_cert` and `set_ca_cert` are required when they are offered,
  // wherever they are offered: at the top level in older versions, inside
  // `other_settings` in newer ones.
  const known = {
    broker: process.env.BENCH_MQTT_HOST || 'mqtt',
    port: Number(process.env.BENCH_MQTT_INTERNAL_PORT || 1883),
    protocol: '5',
    other_settings: { set_client_cert: false, set_ca_cert: 'off' },
    set_client_cert: false,
    set_ca_cert: 'off',
  };

  const offered = new Set((flow.body.data_schema || []).map(field => field.name));
  const payload = Object.fromEntries(
    Object.entries(known).filter(([name]) => offered.has(name) || offered.size === 0),
  );

  const done = await request(
    `/api/config/config_entries/flow/${flow.body.flow_id}`,
    payload,
    token,
  );
  if (done.body.type !== 'create_entry') throw new Error(`mqtt: ${JSON.stringify(done.body)}`);
  return 'created';
};

// Discovery alone does not decide an entity's id: the registry remembers what
// it gave a unique_id the first time. Both go, and in this order - the
// retained discovery message first, or the entry comes back from it.
const forget = async (token, entities) => {
  for (const entity of entities) {
    await publish(token, `homeassistant/${entity.domain}/${entity.id}/config`, '');
  }
  await wait(1000);

  const ws = await connect(BASE, token);
  const registry = await ws.send({ type: 'config/entity_registry/list' });
  const stale = registry.filter(entry => entry.platform === 'mqtt');

  for (const entry of stale) {
    await ws.send({ type: 'config/entity_registry/remove', entity_id: entry.entity_id });
  }
  ws.close();
  return stale.length;
};

const create = async (token, entities) => {
  for (const entity of entities) {
    await publish(token, `homeassistant/${entity.domain}/${entity.id}/config`, entity.discovery);

    for (const [topic, payload] of Object.entries(entity.state || {})) {
      await publish(token, topic, String(payload));
    }
  }
  await wait(2000);
};

// What Home Assistant decided to call each fixture. Its rules for deriving an
// id from a device and a name have changed more than once, so a manifest names
// fixtures by their own key and the bench substitutes the ids it reads back.
const resolve = async (token, entities) => {
  const ws = await connect(BASE, token);
  const registry = await ws.send({ type: 'config/entity_registry/list' });
  ws.close();

  const byUnique = new Map(registry.map(entry => [entry.unique_id, entry.entity_id]));
  const ids = {};

  for (const entity of entities) {
    const id = byUnique.get(entity.discovery.unique_id);
    if (!id) throw new Error(`fixture ${entity.id} is not in the entity registry`);
    ids[entity.id] = id;
  }
  return ids;
};

export const substitute = (value, ids) => {
  if (typeof value === 'string') {
    return value.replace(/\{\{(\w+)\}\}/g, (whole, key) => (key in ids ? ids[key] : whole));
  }
  if (Array.isArray(value)) return value.map(item => substitute(item, ids));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, ids)]));
  }
  return value;
};

// The build under test, with something after it that changes when the file
// does.
//
// Home Assistant serves `/local` with `Cache-Control: public, max-age=2678400`
// - a month - and the bundle's path never changes, so a browser that has looked
// at the bench once goes on rendering the build it saw then. The scenarios
// never see it, because each run opens a fresh profile; a person looking at the
// dashboard does, and has nothing to tell them: the card's console banner
// prints the version from package.json, which is the same string for every
// build between releases. See #322.
//
// The value follows the file rather than the clock, so the URL in the page is a
// fact about the build and not about the run: `ETag` here is the file's mtime
// and size, so it moves when the bundle is deployed and stays put when it is
// not. Measured in one browser against the bench: a reload with nothing
// changed reports `transferSize: 0`, and a reload after a deploy fetches the
// whole 83KB again.
const cacheBuster = async resource => {
  try {
    const response = await fetch(`${BASE}${resource}`, { method: 'HEAD' });
    const tag = response.headers.get('etag') || response.headers.get('last-modified');

    if (tag) return tag.replace(/\W+/g, '').slice(-16);
  } catch {
    // Falls through to the clock: a bench that cannot answer for its own
    // bundle is a bench about to fail on something louder than this.
  }
  return String(Date.now());
};

const setupLovelace = async (token, manifest, ids) => {
  const ws = await connect(BASE, token);

  const url = `${manifest.resource}?v=${await cacheBuster(manifest.resource)}`;
  const resources = await ws.send({ type: 'lovelace/resources' });
  // Matched on the path, so the one from the last run is updated rather than
  // joined by a second resource pointing at the same bundle - two of those both
  // load, and the card registers its elements twice.
  const existing = resources.find(resource => resource.url.split('?')[0] === manifest.resource);

  // And nothing else out of the bench's own directory. Two resources pointing
  // at one bundle both load, and the card's `define` then runs twice; a
  // resource left behind by whatever the bench held before 404s on every page
  // load. The sister card's bench, converted from this one, carried
  // `mini-climate-card-bundle.js` for weeks that way - so this is the half that
  // keeps a bench from serving whatever it was before.
  const directory = manifest.resource.replace(/[^/]+$/, '');
  for (const resource of resources) {
    if (resource === existing) continue;
    if (!resource.url.startsWith(directory)) continue;

    await ws.send({ type: 'lovelace/resources/delete', resource_id: resource.id });
  }

  if (!existing) {
    await ws.send({ type: 'lovelace/resources/create', res_type: 'module', url });
  } else if (existing.url !== url) {
    // Storage mode has `update`; the bench creates its dashboards through the
    // websocket API, so it is always in storage mode here. Deleting and
    // recreating is the fallback for a Home Assistant that predates it.
    try {
      await ws.send({
        type: 'lovelace/resources/update',
        resource_id: existing.id,
        res_type: 'module',
        url,
      });
    } catch {
      await ws.send({ type: 'lovelace/resources/delete', resource_id: existing.id });
      await ws.send({ type: 'lovelace/resources/create', res_type: 'module', url });
    }
  }

  const dashboards = await ws.send({ type: 'lovelace/dashboards/list' });
  // A dashboard url has to carry a hyphen; Home Assistant rejects 'bench'.
  if (!dashboards.some(dashboard => dashboard.url_path === DASHBOARD)) {
    await ws.send({
      type: 'lovelace/dashboards/create',
      url_path: DASHBOARD,
      title: 'Bench',
      require_admin: false,
      show_in_sidebar: true,
    });
  }

  await ws.send({
    type: 'lovelace/config/save',
    url_path: DASHBOARD,
    config: { views: substitute(manifest.views, ids) },
  });
  ws.close();
};

export const readManifest = async () =>
  JSON.parse(await readFile(process.env.BENCH_MANIFEST || 'test/e2e/bench.json', 'utf8'));

export const prepare = async () => {
  const manifest = await readManifest();
  const tokens = await authenticate();
  const token = tokens.access_token;

  const broker = await setupBroker(token);
  const forgotten = await forget(token, manifest.entities);
  await create(token, manifest.entities);

  const ids = await resolve(token, manifest.entities);
  await setupLovelace(token, manifest, ids);

  return { manifest, tokens, ids, broker, forgotten, dashboard: `${BASE}/${DASHBOARD}/0` };
};
