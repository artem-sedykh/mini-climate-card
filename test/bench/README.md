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

A picture taken by an **external browser** comes out in whatever language the
bench host speaks, because the frontend renders in the machine's locale. The
scenarios never hit that - `open()` in `browser.mjs` pins `locale: 'en-US'`
and `selectedLanguage: 'en'` - but a manual playwright session does not, so
capturing screenshots from one needs the same two pins. For the repository,
English labels (Config/Visibility, Save) are the ones worth showing, so set
them before the shot:

```js
localStorage.setItem('selectedLanguage', JSON.stringify('en'));
```

`up` and `down` need docker on this machine. Everything else talks to whatever
`BENCH_URL` names, so a bench running on another host is used from here with
`BENCH_URL=http://<host>:8124 npm run test:e2e`.

### A bench on another host

Two variables besides the URL are the point of contact when the bench is not
on this machine:

| variable | what it is |
|---|---|
| `BENCH_MQTT_HOST` | where the broker answers - the bench host, not `localhost` |
| `BENCH_MQTT_INTERNAL_PORT` | the port the broker answers on **inside** the compose network, not the published one |

The bundle is the other trap. The bench serves the `dist/` it was started
with, from the `/config/www/bench` mount; build the new bundle first, then
copy it to that directory on the bench host, or the scenarios exercise the
previous build while the manifest talks about a new option. The failure has
nothing to do with the option - a card that was just made to accept an object
for `icon` reports `this.icon.split is not a function`, because the code that
was served predates the change.

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

The views after them are repros and answers that need a page of their own. One
of those is a **theme**: `config-seed/themes/glass.yaml`, applied by the view
that carries `"theme"` in the manifest. It is there because the answer to #164
is a set of CSS variables, and a theme is the only native way to set them - the
way most reporters actually set them is `card_mod`, a third-party resource this
bench does not carry and does not test.

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

## Waiting for something to have happened

**Poll for the state; do not wait out a duration and read once.** `until()` in
`browser.mjs` takes a check and a `diagnose`, and everything that arrives
asynchronously - a menu opening, an entity settling, a label appearing - is
read through it.

A fixed `waitForTimeout` in that position is a race with no symptom but an
occasional red run, and the cost is not the rerun: the failure lands on
whatever branch happens to be under it and reads as that branch breaking
something. That is #304 - a menu read 400ms after the click, which failed once
on a commit whose only change was a markdown file.

`diagnose` is the other half. `timed out: last value null` says nothing;
`{"open":false,"items":["auto","low",...]}` says the menu had its options and
still reported closed, which is a different bug from the menu never opening.

A fixed wait is still right in three places, and they are worth telling apart:

- **settling after a load** - the `waitForTimeout(1500)` in a `before` hook,
  after `waitForSelector`, where nothing is being asserted yet;
- **waiting for something to be over** - a dialog closing, a menu dismissed by
  Escape;
- **asserting that nothing happens** - a control that presses a reading with no
  `tap_action` and expects no dialog. There is no state to poll for; the wait
  is the measurement.

## Pointing it at an older Home Assistant

`BENCH_HA_VERSION` is the point of this directory, and the first honest attempt
to use it - a matrix of eight versions, looking for the oldest one the card
still works on - is worth writing down, because most of what it found was about
the bench rather than about the card.

**Every leg failed before rendering anything.** `setupBroker` handed the MQTT
config flow `protocol` and `other_settings`, which arrived when that flow was
rewritten; an older Home Assistant answers `extra keys not allowed`. So the
bench could not start on anything older than about 2025 at all. The payload is
built from the step's own `data_schema` now: send what this version offers,
skip what it does not. Anything else added here should be built the same way.

With that fixed, the run says this (2026-08-29, v3.3.0):

| version | result |
|---|---|
| 2026.8.3, latest, 2024.12.5 | green |
| 2025.12.4 | the more-info dialog is not detected as open |
| 2025.6.3, 2025.1.4 | the theme scenario's **control** fails: `--ha-card-background` does not reach the card |
| 2024.6.4, 2023.9.3 | the editor scenario times out; 2023.9 also loses the preset row |

None of those is "the card does not render". They are the scenarios' own
assumptions about Home Assistant internals - what an open `ha-more-info-dialog`
looks like, whether a theme variable reaches `ha-card`, how the editor dialog
opens - and the result is not even monotonic: 2024.12.5 passes where 2025.x
does not.

**So the suite does not answer "the oldest version this card supports"**, and
`hacs.json` names no minimum for that reason. Getting an answer means triaging
those three scenarios version by version, not reading a matrix. If you take
that on, start with the theme control: it is the one that already knows how to
say "this measurement cannot see anything here".

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
