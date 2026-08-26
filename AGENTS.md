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
as text in YAML, and `compileTemplate` in `src/utils/utils.ts` re-parses it
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
`src/main.ts`, and the context is `{ ...value }` - **the option's own YAML
spread into it**. So anything the user writes beside a template is readable
from the template as `this.<key>`. That is not an accident to tidy up; it is
the extension point, and it is why unknown keys inside an indicator or a button
cannot be rejected.

On top of that the context carries:

- `entity_config` - the whole card configuration.
- `toggle_state` - the `on`/`off` flip from `src/utils/utils.ts`.
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
npm run typecheck     # tsc --noEmit; esbuild strips types, it never checks
npm test              # vitest, the unit tests under test/
npm run test:coverage # the same, with coverage and its thresholds
npm run test:watch    # vitest in watch mode
npm run test:browser  # @web/test-runner, the component tests in two engines
npm run rollup        # bundle src/main.ts -> dist/mini-climate-card-bundle.js
npm run dev           # the same bundle, unminified
npm run check:bundle  # assertions on the built bundle (needs a build first)
npm run build         # lint + format:check + test + rollup + check:bundle
npm run watch         # unminified, rebuilding on save
```

Node version comes from `.nvmrc`. Use it; CI reads the same file.

There are **two layers of checks** so far - see "Checks" below. Nothing renders
the card; see "Known debt".

## Checks

Two layers, both run by CI, in the order of how much they cost to run.

**`npm run check:bundle`** - `scripts/check-bundle.mjs`, assertions on
`dist/mini-climate-card-bundle.js` after a build. It is deliberately the first
layer rather than unit tests, because in the sister card every regression that
ever reached users lived in the build rather than in the source: a development
build of lit, a duplicated `@lit/reactive-element`, a directive left unresolved
and emitted as an external `require`. None of them is visible in the source and
all of them are visible in the output file.

It checks that the bundle registers the element and the card picker entry,
carries every `mc-*` component, resolves every import, is not lit's development
build, holds exactly one copy of each lit package, still holds the one
`new Function` that is the template engine, and stays within a tolerance of a
recorded size.

Two of those need explaining:

- **The lit copy count is asserted as exactly one of each.** It was five until
  `@material/mwc-*` went - one lit 3 for the card and a full lit 2 per package.
  Two `ReactiveElement` classes in one bundle break the update cycle, which is
  how one interaction turns into several identical service calls.
- **The size baseline is in `scripts/bundle-baseline.json`,** tracked rather
  than computed. When a change legitimately moves the size, update the file in
  the same commit and say why. Do not widen the tolerance to make a build
  pass - a duplicated `ReactiveElement` is about 11 KB, which is exactly the
  size of change this is there to catch.

## TypeScript

The whole of `src/` is TypeScript (#228). Local imports are written without an
extension, so `.ts` is in the resolver's list in `rollup.config.mjs` and
`web-test-runner.config.mjs` - node's own defaults do not include it.

Types are stripped by esbuild and **checked by nothing at build time** - that
is `npm run typecheck`, and it is part of `npm run build` and of CI.

Three settings are load-bearing rather than preference:

- **`useDefineForClassFields: false`.** A declaration-only field
  (`hass: HomeAssistant;`) otherwise emits as a class field and assigns
  `undefined` over lit's accessor once the components follow: they render, and
  none of their properties arrive.
- **`@web/dev-server-esbuild` is handed the same `tsconfig`.** It does not
  read one on its own, so without it the component tests would run under
  different semantics than the build.
- **The browser plugin names no `target`.** Naming one makes esbuild
  down-level its output, and the component tests would then run against code
  the build never produces.

The migration was checked a step at a time by comparing the built bundle
before and after. The models and the styles came out **byte-identical**; the
components and `main.ts` came to +57 and -36 bytes, each of which is an
enumerated change rather than a surprise. That comparison is the reason the
steps were small.

**`npm test`** - vitest over `test/`, node environment. It covers the six
model classes in `src/models/`, the helpers in `src/utils/`, every branch of
`handleClick` - which is the whole of what `tap_action` does - and the
configuration merge, from the user's YAML end.

`test/config.test.js` and `test/handle-click.test.js` ask for jsdom with a
`@vitest-environment` docblock; the rest do not pay for it. The first
constructs the card element, which works without a DOM because `setConfig`
only reads and merges - nothing renders, so the Home Assistant elements are
never needed.

Two things that suite pins down are worth knowing before changing them:

- **A template reaches its context only if it is an arrow function.**
  `compileTemplate` calls the *wrapper* with `this` set to the context, so an
  arrow captures it - and a `function` expression, which gets its own `this`
  when called, does not. Every example in `README.md` is an arrow.
- **The fan mode and hvac mode dropdowns fill their options in
  `firstUpdated`, not in `setConfig`.** They come from the entity's
  `fan_modes` and `hvac_modes`, and `setConfig` runs before the card has a
  `hass`. Read straight after `setConfig`, the list is empty - which looks
  like a bug from either side.

`npm run test:coverage` is the same run with `@vitest/coverage-v8` on, and CI
uses it in place of `npm test`. It measures the unit layer only, and the
thresholds are set to what the suite reaches today rather than to a round
number. The number is held down by `src/main.ts` at 68%, half of which is
render methods that only run in a browser; the models are at 95%.

`test/menu.test.js` covers the card's own menu under jsdom - when it opens,
when it closes, and what it reports when an option is picked. What jsdom
cannot answer about it - the top layer, the focus, where it lands near an edge
- is the layer below.

**`npm run test:browser`** - `@web/test-runner` over `test/browser/`, in
**Chromium and WebKit**. This is the layer that renders the card. The iOS
companion app draws in WKWebView and desktop Safari is a real share of the
audience, so WebKit is somewhere this card genuinely runs; before #223 nothing
had ever run it there.

`test/browser/helpers/` holds the fixture: `mountCard` builds the card the way
Home Assistant does (`setConfig`, then `hass`, then into the document),
`components` walks the nested shadow roots, and `countRenders` shadows
`render` on each instance.

Three things about it are load-bearing:

- **The stand-ins for `ha-card`, `ha-icon` and `ha-icon-button` each carry a
  `display`.** The real elements bring their own and the card's styles size
  them on the strength of it. An inline stub collapses, and every measurement
  taken through it is then measuring nothing.
- **Renders are counted, not awaited.** `await el.updateComplete` resolves to
  `false` when an update was requested from inside the update cycle, but it
  answers only for the cycle running when it is asked - by the time a walk
  reaches a component two levels down, that component's second pass is over. A
  counter does not care when it is read.
- **Assertions are on strings** - `localName`, `dataset.value`, text. A DOM
  node in a failure report hangs the runner until the timeout with no output,
  which reads like a broken test rather than a failed one.

The first run of that layer found three components deriving state in
`updated()` and asking for a second render pass over a value that was already
known when the first one started - `button.ts`, `dropdown.ts` and
`fan-mode-secondary.ts`, all now doing it in `willUpdate()`. It also found the
target temperature control sending the same temperature more than once when
its presses land in the same millisecond, because the timer that had already
sent compared against a cleared `temp_last_changed` and read the whole epoch
as elapsed time.

The bundle checks were tested by breaking a copy of the bundle six ways - removing the
`new Function`, adding a sixth lit registration, adding lit's dev-mode banner,
leaving a `require`, removing the `customElements.define`, and renaming a
component - and confirming each one fails the run. A check nobody has seen fail
is a check nobody knows works.

## Layout

```
src/
  main.ts            <mini-climate>, the card element: lifecycle, the whole
                     configuration merge, and the top-level render
  components/        the sub-elements the card renders, registered as mc-*
                     menu.ts is the card's own dropdown menu
  models/            wrappers that turn raw hass state into what a component
                     renders (climate, button, indicator, temperature,
                     target-temperature, hvac-mode)
  utils/             template compilation, click handling, define()
  const.ts           icons, the off/unavailable state lists, tap action names
  style.js           card styles
  sharedStyle.js     styles shared with the sub-elements
release_notes/       one file per version, read by the release workflow
```

The card has **no translations of its own**. `src/utils/getLabel.ts` asks
`hass.localize` for Home Assistant's own keys and falls back to a literal.

## How a card configuration is resolved

This is the part worth understanding before changing anything about options.
All of it lives in `setConfig` in `src/main.ts` and the `get*Config` methods
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

Every component registers itself at the bottom of its own module -
`define('mc-button', ClimateButton)` - and `main.ts` imports those modules for
that alone. `src/utils/define.js` is `customElements.define` without the throw
when the name is already taken, which is what a page that loads the bundle
twice does.

**The names are global**, which is why they are prefixed. They were not until
the scoped element registry came out. Every component used to extend
`ScopedRegistryHost(LitElement)` and declare what it could render in a static
`elementDefinitions`, and that had two silent failure modes:

- **`@lit-labs/scoped-registry-mixin` calls `attachShadow({ customElements })`,
  which no browser implements.** It is the API of a polyfill this card never
  shipped and Home Assistant happened to load. Where that polyfill was missing
  the card mounted as an empty shell and said nothing, which is what the "card
  is not visible" reports read like.
- **Where it was present, a tag a component forgot to declare never upgraded** -
  also silently, as an inert unknown element with `disabled` having no effect
  on it. That was live in `fan-mode-secondary.js`, measured on a running Home
  Assistant.

**Home Assistant's elements are simply used.** `ha-card`, `ha-icon` and
`ha-icon-button` are defined globally by the frontend, so a template can name
them. There is no longer any machinery waiting for them to appear, and no
`render` that returns an empty template until it has.

## The dropdown

`src/components/menu.js` is the card's own menu, and it is worth knowing why
rather than reaching for a component library again.

It used to be `@material/mwc-menu` and `@material/mwc-list`, wrapped in
`src/components/mwc/` so the card's copies could go in a scoped registry rather
than be defined globally. Those packages are end of life on **lit 2** while the
card is on lit 3, so the bundle carried both - and because each package
resolved its own nested copy, it carried lit 2 four times over. Five
`ReactiveElement` classes in one 242 KB file, for a list of modes. Removing
them took the bundle to 80 KB.

What the card needs is small - a list of `{ id, name }`, one of them current,
opened against an anchor - and that is what the component does. The interface
is the one the two call sites already used: set `anchor`, call `show()`, listen
for `selected` with the index in its detail. Two details are not obvious:

- **The menu is positioned by hand.** The card clips its own overflow, so a
  menu that stayed in flow would be cut off. Where the browser has the popover
  API the menu is also put in the top layer, which survives a transformed
  ancestor - Home Assistant creates one while a dashboard is being edited.

  **It is an enhancement only where the browser has never heard of it**, and
  that distinction is load-bearing. `popover="manual"` renders with the menu,
  and an engine that honours the attribute keeps such an element
  `display: none` until `showPopover` puts it in the top layer - so where the
  attribute applies and the call does not land, the menu is invisible rather
  than un-layered, and the hand positioning cannot help. `showPopover` refuses
  on an element that is already showing, and engines have refused it in other
  states, so the call is guarded and the attribute is dropped when it fails.
- **Dismissal is the card's own.** `popover="manual"` means no light dismiss
  from the browser, so the component listens for a press outside itself, for
  Escape, and for the page scrolling, and closes on all three. The anchor
  counts as inside: otherwise its own click handler reopens what the press just
  closed, and the menu could not be dismissed by pressing the button again.

`test/menu.test.js` covers the parts that fail silently - when it opens, when
it closes, and what it reports when an option is picked. Positioning is not
covered there, because jsdom measures every element as zero.

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

- **Nothing renders the card.** The unit layer stops at `setConfig` and the
  models; there is no component layer, so anything that only shows up once the
  card is on a dashboard - which is where this card has broken before - is
  caught by hand or not at all.
- **The card's own `tap_action` in string form does nothing** (#234). An indicator's
  string is normalised to `{ action: <string> }`; the card's own is not, so the
  user's string replaces the default object wholesale, and `handleClick` then
  reads `config.action` off a string and returns. Every value but `none`
  is a dead click.
- **Whether the card looks clickable has nothing to do with `tap_action`**
  (#234).
  `.entity__info__name_wrap` carries `cursor: pointer` unconditionally, so a
  card configured to do nothing still invites a click. `computeClasses`
  computes a `--more-info` class for this and gets it wrong twice over: it
  compares the whole option against the string `'none'`, which an object never
  equals, and no stylesheet uses the class at all.
- **`updateTemperature` compared a property `TemperatureObject` never had**
  (#233). The dead clause is gone; what it was meant to say is still open.
- **`getIndicatorConfig` spells the default source key `enitity`.** Harmless
  today, because a user-supplied `source` replaces the whole object, but it is
  the kind of typo that makes a working option look unsupported.
- **`README.md` is 55 KB** and is the only documentation there is.
