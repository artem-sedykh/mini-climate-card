## What this changes

<!-- One or two sentences. Link the issue if there is one. -->

## How it was verified

<!--
Nothing here renders the card - the unit tests stop at the models and the
configuration merge - so this section is the verification.

Which Home Assistant version did you load the card on, and which device? The
card renders Home Assistant's own frontend elements and they change between
releases, so "it works here" is only meaningful with a version next to it.
-->

- Home Assistant version:
- Climate entity / integration:

## Checklist

- [ ] `npm run build` passes (lint, formatting, tests, bundle and its checks)
- [ ] The card was loaded in a running Home Assistant, not only built
- [ ] A new component registers itself with `define('mc-...', ...)` at the bottom of its module
- [ ] This adds or changes an option, and the docs carry a usage example
      for it, linked from the option's row in `docs/configuration.md`
- [ ] `npm run test:e2e` passes against the bench, if this changes rendering
      or interaction - the bench is what a real Home Assistant answers

> Note: options are documented in `docs/` since #239; `README.md` is the
> entry page and no longer carries the option tables. `check:options` confirms
> the card and the docs name the same list, and `test/bench/README.md` covers
> running the bench.
