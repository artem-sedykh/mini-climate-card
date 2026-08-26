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

- **There are no unit tests yet.** `npm run check:bundle` asserts things about
  the built file, and that is the whole of the automated coverage. So please
  load your change into a running Home Assistant, say which version you tested
  on, and be plain about what you could not check.
- **Every component declares the tags it may render** in a static
  `elementDefinitions`. This is not decoration: the card mounts its components
  into a scoped element registry, so a tag that is not declared there **never
  upgrades** - it stays an inert unknown element, with no error anywhere. If
  you add an `ha-*` or `mc-*` tag to a template, add it to that list.
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

CI runs lint, formatting, the build, assertions on the built bundle, HACS
validation, and a gate that catches CRLF and BOM. `npm run build` locally
covers everything except the last two.

## Releasing

Maintainers only. Bump `version` in `package.json`, add
`release_notes/v<version>.md`, tag `v<version>` and push the tag. The release
workflow refuses to publish if the tag and `package.json` disagree, or if the
notes are missing.
