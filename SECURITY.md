# Security policy

## Supported versions

The latest release only. This card is distributed through HACS as a single
bundle, HACS updates users to the newest tag, and there are no maintenance
branches behind it - a fix ships as a new release rather than as a patch to an
older one.

| Version | Supported |
|---|---|
| latest release | yes |
| anything earlier | no - update through HACS |

## Reporting a vulnerability

Use GitHub's private vulnerability reporting:
[Report a vulnerability](https://github.com/artem-sedykh/mini-climate-card/security/advisories/new).
It opens a private advisory that only the maintainer can see, so nothing is
disclosed while there is no fix.

Please do not open a public issue for a vulnerability. Ordinary bugs are welcome
there - [issue templates](https://github.com/artem-sedykh/mini-climate-card/issues/new/choose).

What to expect: this is a spare-time project with one maintainer, so no clock is
promised. A report gets acknowledged, and if it is a real problem the fix goes
out in the next release and the advisory is published then - after the fix, not
on a fixed schedule. If a report turns out to be the behaviour described below
rather than a defect, that is said plainly and the advisory is closed.

## What runs in the browser

Worth knowing before deciding whether something is a vulnerability here.

**A card configuration is code.** The templates a user writes for indicators,
buttons, `hide`, `style`, `change_action` and the rest are compiled with
`new Function` and run in the page
([`src/utils/utils.js`](https://github.com/artem-sedykh/mini-climate-card/blob/master/src/utils/utils.js)).
This is deliberate: it is what lets the card be described in YAML end to end,
so a device nobody here has heard of can go on a dashboard without a pull
request.

The consequence follows from it: **pasting somebody else's card YAML into a
dashboard runs their code in your browser**, with whatever that browser session
can reach - including your Home Assistant. Treat a card configuration from a
forum post, an issue thread or a blog the way you would treat a script you were
told to run: read it first. This is not a defect report, because the
alternative is a card that only does what was anticipated when it was written.

Writing a template into your own dashboard is not a privilege escalation
either: editing a dashboard already requires an administrator, and an
administrator can run anything in Home Assistant already.

**What is in scope**, then, is the card mishandling data it did not author:
entity state, attributes and names coming from devices and integrations, which
a user does not choose the way they choose their YAML. Anything that turns that
into script execution, or reads it out to somewhere it should not go, is a
vulnerability worth reporting.

## Dependencies

The bundle ships [lit](https://lit.dev), `@material/mwc-*`,
`@lit-labs/scoped-registry-mixin` and `resize-observer-polyfill`. Everything
else in `package.json` is a build tool and never reaches a browser. Dependabot
watches both, monthly, and a vulnerability in a bundled dependency that affects
this card is in scope above.

The mwc packages are end of life and are being removed
([#198](https://github.com/artem-sedykh/mini-climate-card/issues/198)), which
is worth knowing when reading a dependency alert against them.
