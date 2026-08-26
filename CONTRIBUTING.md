# Contributing

Thanks for taking the time. This is a small repository, so the process is
short.

Everything here is in **English**: code, comments, commit messages, issues and
pull requests. How people are expected to treat each other is in
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Reporting something

Use the [issue templates](https://github.com/artem-sedykh/mini-climate-card/issues/new/choose).
They ask for two things that are easy to leave out and impossible to work
without:

- **Your Home Assistant version.** The card renders Home Assistant's own
  frontend elements, and those change between releases without notice. Home
  Assistant 2026.x rebuilt `ha-icon-button` and changed how it is sized; a
  layout report without a version cannot be placed.
- **The entity's state and attributes**, from **Developer tools -> States**.
  Almost every "this option does nothing" turns out to be a device that
  reports different attributes than the configuration expects.

## Changing the code

Pull requests go against `master`.

```console
git clone https://github.com/artem-sedykh/mini-climate-card.git
cd mini-climate-card
npm ci
npm run rollup
```

`npm run dev` builds the same bundle unminified, which is what you want while
debugging in a browser; it loads in Home Assistant exactly the same.
Copy `dist/mini-climate-card-bundle.js` into the Home Assistant `config/www`
directory, reference it from a dashboard resource with a query string
(`/local/mini-climate-card-bundle.js?v=<anything-new>`), and hard-reload. The
frontend caches resources aggressively, and a stale bundle looks exactly like
a change that did nothing.

A few things worth knowing before you start. All of them are in
[AGENTS.md](AGENTS.md), which is the longer version of this section.

- **Four layers of tests, and the fourth one is a Home Assistant.** `npm test`
  covers the models, the utils and the configuration merge; `npm run
  test:browser` renders the card in Chromium and WebKit, which needs
  `npx playwright install chromium webkit` once; `npm run check:bundle`
  asserts things about the built file. Those three register **stand-ins** for
  `ha-card`, `ha-icon` and `ha-icon-button`, and the real ones are where this
  card has broken before - so there is a fourth:

  ```console
  npm run rollup      # the bench serves dist/
  npm run bench up    # Home Assistant and a broker in docker, on port 8124
  npm run test:e2e    # the card on a real dashboard, clicked by a real browser
  npm run bench shot  # or just pictures of it, into test/e2e/shots/
  npm run bench down
  ```

  It needs docker, and it is the only layer that sees the actual Home
  Assistant elements. Which entities exist and what the dashboard holds are
  in `test/e2e/bench.json` - adding a card to that file is how you put your
  own configuration in front of the browser. The rest, including how the
  entities are invented and what is deliberately **not** tested there, is
  [test/bench/README.md](test/bench/README.md).

  None of the four is your own installation. Please still load the change into
  a running Home Assistant, say which version you tested on, and be plain
  about what you could not check.
- **Every component registers itself** at the bottom of its own module, with
  `define('mc-something', TheClass)`, and the card imports those modules for
  that alone. The names are global, which is why they are prefixed - a new
  component needs a `mc-` name nobody else would pick.
- The elements the card renders belong to the Home Assistant frontend and are
  not a stable API. Feature-detect them rather than branching on a version
  string.
- Options like `disabled`, `hide`, `style` and `change_action` are **template
  strings** the user writes, compiled with `new Function` and called with a
  context built from the option's own YAML. A key the card does not recognise
  inside an indicator or a button is therefore not a mistake to reject - it is
  readable from the template, which is what makes the card configurable at all.
- Prettier is configured with `embeddedLanguageFormatting: off`, because it
  otherwise rewrites the markup inside lit templates. Please leave it off.

Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
without a scope: `fix:`, `feat:`, `ci:`, `build:`, `docs:`.

CI runs lint, formatting, the unit tests with coverage thresholds, the
component tests in both engines, the build, assertions on the built bundle,
HACS validation, and a gate that catches CRLF and BOM. `npm run build` locally
covers everything except the component tests and the last two.

The bench runs in a workflow of its own, against two versions of Home
Assistant. **The `latest` leg is allowed to fail**, and if it does on your pull
request it is almost certainly not your fault: it means a Home Assistant
release changed something under the card. Say so in the pull request and carry
on - the leg that has to pass is the pinned one.

## Releasing

Maintainers only. Bump `version` in `package.json`, add
`release_notes/v<version>.md`, tag `v<version>` and push the tag. The release
workflow refuses to publish if the tag and `package.json` disagree, or if the
notes are missing.
