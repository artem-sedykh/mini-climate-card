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
- [ ] `README.md` updated, if this changes or adds an option
