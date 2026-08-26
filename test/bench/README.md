# The bench

A Home Assistant of its own, in a container, with a broker to invent devices
on. It exists for the failures the other layers cannot see: the ones where
**Home Assistant changed rather than the card**.

Two of those are already in this repository's history. [#188] - the entity icon
stopped being centred when `ha-icon-button` was rebuilt on `ha-button` and the
size moved from `--mdc-icon-button-size` to `--ha-icon-button-size`. [#175] -
the dropdowns disappeared on 2026.5 when `mwc` went. Both were invisible to
every test here while they were broken, because `test/browser/` renders the
card against **stand-ins** for the Home Assistant elements: the stubs carry a
`display` and nothing else, so there is nothing in them to break.

Nothing in this directory names a card. What is under test comes from a
manifest - `test/e2e/bench.json` here - so the directory copies into the sister
card unchanged.

## Running it

```
npm run rollup          # the bench serves dist/, so build first
npm run bench up        # fresh instance, entities, dashboard
npm run test:e2e        # the scenarios in test/e2e/
npm run bench down      # and it is gone
```

`up` and `down` need docker on this machine. Everything else talks to whatever
`BENCH_URL` names, so a bench running on another host is used from here with
`BENCH_URL=http://<host>:8124 npm run test:e2e`.

| variable | default | what it is |
|---|---|---|
| `BENCH_URL` | `http://localhost:8124` | where Home Assistant answers |
| `BENCH_HA_VERSION` | `2026.8.3` | the image tag, and the point of the bench: vary it |
| `BENCH_HA_PORT` | `8124` | published port |
| `BENCH_MQTT_PORT` | `1884` | published broker port |
| `BENCH_CARD_DIST` | `../../dist` | what is served as `/local/bench/` |
| `BENCH_MANIFEST` | `test/e2e/bench.json` | which card, which entities, which dashboard |

## What it is not

It is **not** where geometry is measured. `test/browser/` renders the card in
two engines in seconds, needs no container and gives the same numbers every
time; a scenario here costs a container boot and can only ever be flakier.
What belongs here is what a whole Home Assistant has to answer: the real
elements, the real dashboard, the real service call.

It is also not a replacement for a live installation. Real integrations, real
devices and real themes still live there.

## How the entities work

MQTT climate, published as discovery messages **by Home Assistant itself**
(`mqtt.publish`), so the bench needs no MQTT client of its own.

The fixtures deliberately have **no state topics** for what the card writes.
MQTT climate is optimistic without them: a press moves the entity with no
device on the other end to echo it back. What the bench does drive - the
current temperature, the action, availability - has topics of its own, which is
how a scenario puts an entity into a state that matters.

Removing an entity is an empty retained payload on its discovery topic. That
is also how an entity leaves `hass.states` for real, which is the situation
behind [#46].

## Four things that cost an afternoon

- **All four onboarding steps have to be closed**, not just the user: `user`,
  `core_config`, `analytics`, `integration`. While any is open the frontend
  redirects a browser to `/onboarding.html`, which from the outside looks
  exactly like a card that will not load.
- **A dashboard url has to contain a hyphen.** `bench` is rejected,
  `card-bench` is not.
- **Discovery does not decide an entity's id.** The entity registry remembers
  what it gave a `unique_id` the first time, and Home Assistant's rules for
  deriving an id from a device and a name have changed more than once. The
  bench reads the ids back out of the registry and substitutes them into the
  dashboard, so a manifest names fixtures by their own key (`{{bench_ac}}`).
- **The broker is set up through the config flow**, not by writing a config
  entry: MQTT has had no YAML for the connection since 2022. Its `broker` step
  has a section named `other_settings` whose two certificate keys are required
  even when nothing about them is being set.

[#46]: https://github.com/artem-sedykh/mini-climate-card/issues/46
[#175]: https://github.com/artem-sedykh/mini-climate-card/issues/175
[#188]: https://github.com/artem-sedykh/mini-climate-card/issues/188
