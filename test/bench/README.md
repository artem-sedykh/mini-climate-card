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
npm run bench shot      # a picture of the dashboard and of each card
npm run bench down      # and it is gone
```

`shot` is the other half of what this is for: an answer to "the layout is off"
that is a screenshot rather than a paragraph. Point `BENCH_MANIFEST` at a
manifest holding the reporter's own YAML and the pictures are of their card.

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

## In CI

`.github/workflows/bench.yml`, on pushes and pull requests that touch `src/`,
`test/bench/` or `test/e2e/`, and once a week. Two legs:

- **the pinned version** - what the card is documented against and what most
  users are on. Not allowed to fail.
- **`latest`** - allowed to fail, on purpose. A break there is news about Home
  Assistant rather than about the branch being pushed, and blocking a
  contributor's pull request on it would be telling them to fix something that
  is not theirs. Home Assistant ships monthly, which is what the weekly run is
  for: hearing it before a user does.

It is deliberately **not** part of `Continuous Integration`. That workflow's
`build` job is the required check on master, and a required check should be
quick and should answer for this repository alone.

Screenshots are uploaded as an artifact on every run, failed or not - a red
browser test is hard to read without one.

## What the manifest holds

Two views, and the difference between them is the point:

- **the first** is the card as its defaults render it, plus the cases the
  scenarios need - an entity that is not in `hass.states`, a hidden icon, a
  fan mode dropdown;
- **the second** is the card as people actually write it, modelled on
  configurations in daily use: modes and fan speeds renamed, indicators reading
  other entities, one of them mapping its value through a template, dropdown
  buttons calling a service of their own, and both spellings of `tap_action` in
  the same card.

A card with nothing but an `entity` exercises almost none of what the tracker
asks about, which is why the second view exists.

## What the scenarios reach

```
npm run dev             # unminified, and the sourcemap the report maps through
npm run bench up
npm run bench:coverage  # runs the scenarios, then reports against src/
```

It answers one question - which parts of `src/` a browser driving a real
dashboard never reaches - and it is **a diagnostic, not a metric**: no
threshold, no badge, nothing fails on it.

It is also not comparable with `npm run test:coverage`. That number is the unit
layer, which excludes `src/components/**` because those only run in a browser;
this one is mostly about exactly those files. One percentage speaking for both
would be a number nobody could act on.

The unminified build is why it is a separate run: what ships is the minified
one, and that is what the scenarios normally exercise.

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
