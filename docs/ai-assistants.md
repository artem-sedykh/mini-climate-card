# AI assistants

[Home](../README.md) | [Configuration](configuration.md) | [Controls](controls.md) | [Indicators](indicators.md) | [Buttons](buttons.md) | [Functions](functions.md) | [Tap action](tap-action.md) | [Secondary info](secondary-info.md) | [Examples](examples.md) | [AI assistants](ai-assistants.md) | [Development](development.md) | [Visual editor](visual-editor-parameters.md)

> Writing a card with Claude, Cursor, ChatGPT or anything else of the kind.

This card is configured rather than coded, which makes it a good fit for an
assistant - and it is a small project, which makes it a bad one. None of them
know the options here, so what comes back looks right and names things the card
does not have.

Two steps fix most of that: give the assistant this documentation, and know how
this card behaves when a configuration is wrong.

## Give it the documentation

The whole site is published in a form made for reading in one go:

| | |
|---|---|
| [llms.txt](https://artem-sedykh.github.io/mini-climate-card/llms.txt) | the index - every page with a line saying what is on it |
| [llms-full.txt](https://artem-sedykh.github.io/mini-climate-card/llms-full.txt) | every page, concatenated |

Both are generated from the pages themselves at build time, so they are never
a stale copy of the documentation.

Where the assistant can fetch a URL, name it:

```text
Read https://artem-sedykh.github.io/mini-climate-card/llms-full.txt and write me
a mini-climate card for climate.bedroom that shows the humidity from
sensor.bedroom_humidity and hides the fan mode.
```

Where it cannot, open the file and paste it. It is the documentation and
nothing else - no code, no history.

## Then check what comes back

Four things about this card that an assistant tends to get wrong. Each one was
a real question in the tracker, which is why they are worth checking first:

- **The mode control is always a dropdown.** `hvac_mode` is built like a button
  and rendered as a menu, so `type: button` on it is read by nothing. To press
  the mode rather than pick it, hide it and put a button in its place -
  [A press instead of the mode dropdown](examples.md#a-press-instead-of-the-mode-dropdown).
- **A template has to be an arrow function.** `state => ...`, not
  `function (state) { ... }`. The card compiles the text and calls it with a
  context bound to `this`; a `function` expression gets its own `this` and sees
  none of it. Every example in these pages is an arrow.
- **An unknown key is not an error.** The configuration is open at the leaves -
  anything written beside a template is handed to that template as
  `this.<key>`, which is how options of your own are passed in. The cost is
  that a misspelled option is not rejected, it just never does anything.
- **A broken configuration is a red square.** Home Assistant draws
  `hui-error-card`, 56px high, and shows no message on it - the text goes to
  the browser console. If a card renders as a red bar, open the console before
  anything else.

And the rule that catches most of the rest: **every option this card has is a
row in the table in [Configuration](configuration.md)**. If an assistant names
one that is not in that table, it does not exist, however plausible it looks.

## What is worth asking for

An assistant is at its best here on the parts that are tedious rather than
uncertain: a set of indicators reading half a dozen sensors, a row of buttons
that all call the same service with a different value, a `source` list renamed
into another language, or a template that maps a value onto an icon.

It is at its worst on what the card actually does with all that. When something
does not work, the fastest way through is usually not another round with the
assistant: check the option against the table, look at the console, and compare
against the recipe closest to what you want in [Examples](examples.md).

Not everything has to be YAML, either: the [visual
editor](visual-editor-parameters.md) covers the common options, and it cannot
invent a name.

## If it still does not work

Open an issue with the configuration exactly as you are running it, the card
version from the console banner, and the Home Assistant version. A
configuration written by an assistant is welcome here - say so if it was, and
what you asked for. That is useful rather than embarrassing: it tells us which
part of these pages an assistant misread, and that is a documentation bug on
our side.
