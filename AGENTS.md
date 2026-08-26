# AGENTS.md

Guidance for AI coding agents working on this repository. Human contributors
are welcome to read it too - it is the short version of how this card is put
together and what breaks it.

## What this is

`mini-climate-card` is a custom Lovelace card for Home Assistant: a single
JavaScript bundle that Home Assistant loads in the browser. There is no server
side, no Python, and no Home Assistant integration in this repository. The card
reads entity state out of the `hass` object and calls Home Assistant services
back.

Distribution is HACS: users get `mini-climate-card-bundle.js` as a release
asset, so **the release asset is the product**. A change is not shipped until
it is in a tagged release.

## The card is configured, not coded

What this card is, is a kit. An `entity:` and nothing else gives a working
card, but almost everything on it can be described in the user's YAML instead:
which indicators exist and what each one reads, which buttons appear, what icon
each takes, what service each one calls, when each is hidden or disabled.

Several of those options are **template strings**. The user writes a function
as text in YAML, and `compileTemplate` in `src/utils/utils.js` re-parses it
with `new Function` and calls it with a context object. That is the one
deliberate `new Function` in the repository.

This is a constraint on what may be changed, not just a description of what is:

- **The configuration is open at the leaves.** Indicator and button ids are
  chosen by the user, and their options are templates the user wrote. Anything
  that validates a configuration, or edits one, has to carry through what it
  does not recognise rather than dropping it. An editor that round-trips a
  hand-written card through a form and silently loses the half it does not
  model is worse than no editor.
- **A template is source text, not a function.** It is compiled at
  `setConfig` time, before the card has a `hass`, which is why the context
  passes `call_service` as a closure rather than a value.

### The template context

Every compiled template is called with `this` bound to a context built in
`src/main.js`, and the context is `{ ...value }` - **the option's own YAML
spread into it**. So anything the user writes beside a template is readable
from the template as `this.<key>`. That is not an accident to tidy up; it is
the extension point, and it is why unknown keys inside an indicator or a button
cannot be rejected.

On top of that the context carries:

- `entity_config` - the whole card configuration.
- `toggle_state` - the `on`/`off` flip from `src/utils/utils.js`.
- `call_service(domain, service, options)` - for buttons and target
  temperature only. Indicators do not get it, because an indicator displays.

## Language

**English only**, everywhere: code, comments, commit messages, issues, pull
requests, documentation, and release notes. This is a public repository with
external contributors who do not read Russian.

## Commands

```
npm ci                # install exactly what the lockfile says
npm run lint          # eslint 10, flat config
npm run format        # prettier --write
npm run format:check  # what CI runs
npm run rollup        # bundle src/main.js -> dist/mini-climate-card-bundle.js
npm run dev           # the same bundle, unminified
npm run check:bundle  # assertions on the built bundle (needs a build first)
npm run build         # lint + format:check + rollup + check:bundle
npm run watch         # unminified, rebuilding on save
```

Node version comes from `.nvmrc`. Use it; CI reads the same file.

There is **one layer of checks** so far - see "Checks" below. There are no
unit or component tests yet; see "Known debt".

## Checks

**`npm run check:bundle`** - `scripts/check-bundle.mjs`, assertions on
`dist/mini-climate-card-bundle.js` after a build. It is deliberately the first
layer rather than unit tests, because in the sister card every regression that
ever reached users lived in the build rather than in the source: a development
build of lit, a duplicated `@lit/reactive-element`, a directive left unresolved
and emitted as an external `require`. None of them is visible in the source and
all of them are visible in the output file.

It checks that the bundle registers the element and the card picker entry,
carries every `mc-*` component, resolves every import, is not lit's development
build, has not grown its lit copy count, still holds the one `new Function`
that is the template engine, and stays within a tolerance of a recorded size.

Two of those need explaining:

- **The lit copy count is asserted against a baseline, not against one.** It is
  five today (see "The dropdown, and the five copies of lit"), so the check
  guards against a sixth rather than against the problem. It becomes `=== 1`
  when `@material/mwc-*` goes.
- **The size baseline is in `scripts/bundle-baseline.json`,** tracked rather
  than computed. When a change legitimately moves the size, update the file in
  the same commit and say why. Do not widen the tolerance to make a build
  pass - a duplicated `ReactiveElement` is about 11 KB, which is exactly the
  size of change this is there to catch.

The checks were tested by breaking a copy of the bundle six ways - removing the
`new Function`, adding a sixth lit registration, adding lit's dev-mode banner,
leaving a `require`, removing the `customElements.define`, and renaming a
component - and confirming each one fails the run. A check nobody has seen fail
is a check nobody knows works.

## Layout

```
src/
  main.js            <mini-climate>, the card element: lifecycle, the whole
                     configuration merge, and the top-level render
  components/        the sub-elements the card renders, registered as mc-*
    mwc/             thin wrappers around @material/mwc-* (see "The dropdown")
  models/            wrappers that turn raw hass state into what a component
                     renders (climate, button, indicator, temperature,
                     target-temperature, hvac-mode)
  utils/             template compilation, click handling, element registration
  const.js           icons, the off/unavailable state lists, tap action names
  style.js           card styles
  sharedStyle.js     styles shared with the sub-elements
rollup-plugins/      one plugin: ignore, which empties the mwc modules that
                     would otherwise register themselves globally
release_notes/       one file per version, read by the release workflow
```

The card has **no translations of its own**. `src/utils/getLabel.js` asks
`hass.localize` for Home Assistant's own keys and falls back to a literal.

## How a card configuration is resolved

This is the part worth understanding before changing anything about options.
All of it lives in `setConfig` in `src/main.js` and the `get*Config` methods
around it.

1. **The entity is checked**, and `setConfig` throws for anything outside the
   `climate` and `fan` domains.

   Before making anything else throw, know what a throw does. Measured on Home
   Assistant 2026.8.3: **a thrown `setConfig` message reaches the console and
   never the card**. `hui-error-card` draws a red icon 56px high and drops the
   text - no message, no title, no tooltip, nothing on click. A built-in card
   with a broken configuration looks exactly the same. So the text a throw
   carries is written for someone who has opened the console, and on the
   dashboard it says nothing at all.
2. **Each section is merged over its defaults and its templates compiled** -
   indicators, buttons, fan mode, target temperature, temperature, hvac mode,
   the toggle, secondary info. Every one of them is built by a method that
   spreads the user's YAML over a default object and then compiles whatever
   option is a template.
3. **`hvac_mode` and `fan_mode` are buttons**, built by the same
   `getButtonConfig` as any other. The fan mode is pushed into
   `config.buttons` under the id `fan_mode`, which is why it can be reached
   from a configuration like any other control.
4. **Their sources default from the entity, but only in `firstUpdated`** -
   `initDefaultFanModeSource` and `initDefaultHvacModeSource` fill the dropdown
   from `fan_modes` and `hvac_modes` when the user named no source. That is
   after the first render rather than in `setConfig`, because it needs `hass`.

Two shorthands are normalised, and they are not normalised the same way:

- **`secondary_info` as a string** becomes `{ type: <string> }`. Handled.
- **An indicator's `tap_action` as a string** becomes `{ action: <string> }`.
  Handled, in `getIndicatorConfig`.
- **The card's own `tap_action` as a string is not normalised.** The default
  object is spread over by the user's value, so a string replaces the whole
  object, and `handleClick` then reads `config.action` off a string and returns
  having done nothing. See "Known debt".

## Registering the elements

Every component extends `ScopedRegistryHost(LitElement)` and declares what it
may render in a static `elementDefinitions`, built by
`src/utils/buildElementDefinitions.js`. Read this section before adding a tag
to any component's template.

**The scoping is real, and it is not the browser's.**
`@lit-labs/scoped-registry-mixin` calls `attachShadow({ customElements })`,
which no browser implements - it is the API of a polyfill this card does not
ship. Home Assistant happens to load `scoped-custom-element-registry`, and that
is what makes it work. Measured in a live 2026.8.3 frontend:
`CustomElementRegistry` in the page is not native, and `attachShadow` with a
registry is honoured.

Two consequences, and both have bitten:

- **Where the polyfill is absent, the whole card mounts as an empty shell**
  and says nothing. That is what the "card is not visible" reports look like.
- **Where it is present, a tag a component did not declare never upgrades** -
  also silently. It stays an unknown element: `display: inline`, no shadow
  root, no behaviour. `disabled` does nothing, because what implements
  `disabled` is the element that never came up.

`buildElementDefinitions` also handles the case where a Home Assistant element
is not defined yet: it waits on `customElements.whenDefined` and flips
`elementDefinitionsLoaded` when they all arrive. Components render an empty
template until then - which is why several of them start with
`if (!X.elementDefinitionsLoaded) return html``;`.

All of this machinery exists to avoid colliding with Home Assistant's own
element names. Removing it in favour of prefixed global names is issue #198;
the sister card did exactly that and the empty-shell failure went with it.

## The dropdown, and the five copies of lit

`src/components/dropdown-base.js` and `src/components/fan-mode-secondary.js`
render `mwc-menu` and `mwc-list-item` from `@material/mwc-*`, wrapped in
`src/components/mwc/` so the card's copies can be put in a scoped registry
rather than defined globally. `rollup-plugins/ignore.js` empties the modules
that would otherwise self-register.

The cost is not the wrappers. Those packages are end of life on **lit 2**,
while the card is on lit 3, so the bundle carries both - and because each mwc
package resolves its own nested copy, it carries lit 2 four times over:

```
reactiveElement -> 2.0.2  1.6.3 1.6.3 1.6.3 1.6.3
litHtml         -> 3.1.0  2.8.0 2.8.0 2.8.0 2.8.0
litElement      -> 4.0.2  3.3.3 3.3.3 3.3.3 3.3.3
```

That is five `ReactiveElement` classes in one 255 KB file, for a list of modes.
Duplicated reactive elements break the update cycle, which is how one
interaction turns into several identical service calls. Replacing this with the
card's own menu is issue #198.

## Home Assistant compatibility

The card renders Home Assistant's own frontend elements (`ha-card`, `ha-icon`,
`ha-icon-button`). None of them are a stable API: they are internal frontend
components that change between releases without notice, and they have broken
this card before.

Known boundary: **Home Assistant 2026.x rebuilt `ha-icon-button` on
`ha-button`** (WebAwesome). It now takes its size from `--ha-icon-button-size`
and no longer reads `--mdc-icon-button-size`, so the inner button stayed at its
48px default inside a host the card had constrained to 30px - every icon button
overflowing its box by 18px. Both custom properties are now set next to each
other, so the card sizes correctly on either. That was issue #188.

When you touch anything that talks to a Home Assistant element:

- Assume the element differs across versions and check, rather than assuming
  the version you happen to run is the only one.
- Prefer property bindings (`.value=`) over attribute bindings for anything the
  user can interact with. Attributes on the newer elements often map to a
  "default" that stops applying after the first interaction.
- Feature-detect the element. Do not branch on the Home Assistant version
  string unless there is no way to detect the behaviour itself.

## Verifying a change by hand

There are no tests yet, so this is the whole of verification. It is also worth
doing after the tests exist: they will render against stand-ins, and what
breaks this card is Home Assistant's own elements.

1. `npm run dev` - the same bundle unminified, which is far easier to debug in
   a browser and loads exactly the same.
2. Copy `dist/mini-climate-card-bundle.js` into the Home Assistant `config/www`
   directory.
3. Reference it from a dashboard resource with a cache-busting query string
   (`/local/mini-climate-card-bundle.js?v=<anything-new>`).
4. Hard-reload the browser. The frontend caches resources aggressively, and a
   stale bundle looks exactly like a change that did nothing.

**Prove which build is running before drawing any conclusion.** The card prints
its version to the console at load (`src/initialize.js`), so make the version
distinguishable in the copy being tested rather than trusting a reload.

Much can also be checked without deploying anything, from the browser console
of a running Home Assistant:

```js
const hass = document.querySelector('home-assistant').hass;

// what the picker would insert, against real entities
customElements.get('mini-climate').getStubConfig(hass, [], Object.keys(hass.states));

// render the card the way a dashboard does, error card and all
const el = document.createElement('hui-card');
el.hass = hass;
el.config = { type: 'custom:mini-climate', entity: 'climate.something' };
document.body.appendChild(el);
```

`hui-card` renders into light DOM and substitutes `hui-error-card` on a bad
configuration, exactly as a dashboard does. Reload to clean up.

### Counting service calls

Before blaming the card for sending a command more than once, count the
commands. Paste this into the browser console, then use the control:

```js
(() => {
  const c = document.querySelector('home-assistant').hass.connection;
  if (c.__patched) return 'already patched';
  c.__patched = 1;
  const original = c.sendMessagePromise.bind(c);
  let n = 0;
  c.sendMessagePromise = m => {
    if (m && m.type === 'call_service')
      console.log('CALL #' + ++n, m.domain + '.' + m.service, JSON.stringify(m.service_data || {}));
    return original(m);
  };
  return 'patched';
})();
```

Every service call goes through this one websocket connection, whichever
`hass` object a component happens to hold, so nothing escapes it. This matters
here more than in most cards: duplicated lit copies are exactly the kind of
fault that shows up as a doubled call rather than as an error.

## Conventions

- ESLint 10 flat config in `eslint.config.js`. Prettier owns formatting;
  `eslint-config-prettier` switches off the rules that would argue with it.
- `embeddedLanguageFormatting` is **off** in `.prettierrc.json` on purpose.
  With it on, prettier reformats the HTML and CSS inside the lit `html` and
  `css` tagged templates, rewriting attribute quotes and moving whitespace
  between elements. That is not a no-op for rendering. Leave it off.
- Conventional Commits, no scope: `fix:`, `feat:`, `ci:`, `build:`, `docs:`.
- Punctuation stays ASCII. No em dashes, no smart quotes, no ellipsis
  character - they break literal greps and are a giveaway of generated text.

## Releasing

1. Bump `version` in `package.json`. It carries a `v` prefix here (`"v2.7.4"`),
   which is unusual but load-bearing: the README badge reads it.
2. Write `release_notes/v<version>.md`. The release job reads that exact path
   and fails if it is missing.
3. Tag `v<version>` and push the tag. `.github/workflows/cd.yml` builds and
   publishes the bundle with that file as the release body.

### What HACS shows

HACS renders **`README.md`**, and only that. The `info.md` convention is dead:
`async_get_info_file_contents` in HACS hardcodes the filename list to variants
of `readme`, so `info.md` is never read and the `render_readme` manifest key no
longer changes anything. Both are still present in this repository and should
go.

Two consequences worth remembering:

- **Relative links do not work in HACS.** It hands the raw markdown to the
  Home Assistant frontend, which resolves `docs/whatever.md` against
  `/hacs/repository/<id>` and 404s. Links in `README.md` have to be absolute.
- **HACS renders the README from the tag of the version the user has
  installed**, not from the default branch. A README fix therefore only
  reaches users with the next release.

## Known debt

Tracked under #198, which is also the order the work is meant to happen in.

- **No unit or component tests.** The bundle assertions are the only layer.
  Nothing checks that a model turns entity state into what a component expects,
  or that the card renders at all.
- **Five copies of lit in the bundle**, from `@material/mwc-*`.
- **`@lit-labs/scoped-registry-mixin`** and the two silent failure modes above.
  `src/components/fan-mode-secondary.js` renders an `ha-icon-button` it never
  declared, so with `secondary_info: { type: fan-mode-dropdown }` that button
  does not upgrade: measured live, `display: inline`, no shadow root, and
  `disabled` has no effect on it.
- **The card's own `tap_action` in string form does nothing.** An indicator's
  string is normalised to `{ action: <string> }`; the card's own is not, so the
  user's string replaces the default object wholesale, and `handleClick` then
  reads `config.action` off a string and returns. Every value but `none`
  is a dead click.
- **Whether the card looks clickable has nothing to do with `tap_action`.**
  `.entity__info__name_wrap` carries `cursor: pointer` unconditionally, so a
  card configured to do nothing still invites a click. `computeClasses`
  computes a `--more-info` class for this and gets it wrong twice over: it
  compares the whole option against the string `'none'`, which an object never
  equals, and no stylesheet uses the class at all.
- **`resize-observer-polyfill`** is bundled for a `ResizeObserver` every target
  browser has had for years.
- **`getIndicatorConfig` spells the default source key `enitity`.** Harmless
  today, because a user-supplied `source` replaces the whole object, but it is
  the kind of typo that makes a working option look unsupported.
- **`README.md` is 55 KB** and is the only documentation there is.
