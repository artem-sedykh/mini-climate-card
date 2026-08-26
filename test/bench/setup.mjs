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
  // `other_settings` is a section of the broker step, and its two certificate
  // keys are required even when nothing about them is being set.
  const done = await request(
    `/api/config/config_entries/flow/${flow.body.flow_id}`,
    {
      broker: process.env.BENCH_MQTT_HOST || 'mqtt',
      port: Number(process.env.BENCH_MQTT_INTERNAL_PORT || 1883),
      protocol: '5',
      other_settings: { set_client_cert: false, set_ca_cert: 'off' },
    },
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

const setupLovelace = async (token, manifest, ids) => {
  const ws = await connect(BASE, token);

  const resources = await ws.send({ type: 'lovelace/resources' });
  if (!resources.some(resource => resource.url === manifest.resource)) {
    await ws.send({
      type: 'lovelace/resources/create',
      res_type: 'module',
      url: manifest.resource,
    });
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
