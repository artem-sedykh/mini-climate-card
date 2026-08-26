# Mini Climate Card

[![Last Version](https://img.shields.io/github/package-json/v/artem-sedykh/mini-climate-card?label=release)](https://github.com/artem-sedykh/mini-climate-card/releases/latest)
[![HACS Default](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/hacs/default)
[![Downloads](https://img.shields.io/github/downloads/artem-sedykh/mini-climate-card/total)](https://github.com/artem-sedykh/mini-climate-card/releases)
[![Stars](https://img.shields.io/github/stars/artem-sedykh/mini-climate-card)](https://github.com/artem-sedykh/mini-climate-card/stargazers)
[![CI](https://img.shields.io/github/actions/workflow/status/artem-sedykh/mini-climate-card/ci.yml?branch=master&label=CI)](https://github.com/artem-sedykh/mini-climate-card/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/artem-sedykh/mini-climate-card/blob/master/LICENSE)

A minimalistic yet customizable climate card for [Home Assistant](https://home-assistant.io/) Lovelace UI.  
Please ⭐️ this repo if you find it useful  

<p style="align-content: center">
  <img alt="card preview" src="https://raw.githubusercontent.com/artem-sedykh/mini-climate-card/master/images/preview.png" />
</p>

## Notice

v2 is only compatible from version 2022.11 onwards

## Install

*This card is available in [HACS](https://github.com/hacs/integration) (Home Assistant Community Store)*

### Simple install

1. Download and copy `mini-climate-card-bundle.js` from the [latest release](https://github.com/artem-sedykh/mini-climate-card/releases/latest) into your `config/www` directory.

2. Add a reference to `mini-climate-card-bundle.js` inside your `ui-lovelace.yaml`.

  ```yaml
  resources:
    - url: /local/mini-climate-card-bundle.js?v=2.21
      type: module
  ```

### CLI install

1. Move into your `config/www` directory

2. Grab `mini-climate-card-bundle.js`

  ```console
  $ wget https://github.com/artem-sedykh/mini-climate-card/releases/download/v2.2.1/mini-climate-card-bundle.js
  ```

3. Add a reference to `mini-climate-card-bundle.js` inside your `ui-lovelace.yaml`.

  ```yaml
  resources:
    - url: /local/mini-climate-card-bundle.js?v=2.2.1
      type: module
  ```

## Updating
1. Find your `mini-climate-card-bundle.js` file in `config/www` or wherever you ended up storing it.

2. Replace the local file with the latest one attached in the [latest release](https://github.com/artem-sedykh/mini-climate-card/releases/latest).

3. Add the new version number to the end of the cards reference url in your `ui-lovelace.yaml` like below.

  ```yaml
  resources:
    - url: /local/mini-climate-card-bundle.js?v=2.2.1
      type: module
  ```

*You may need to empty the browsers cache if you have problems loading the updated card.*

## Documentation

The full documentation is at
**[artem-sedykh.github.io/mini-climate-card](https://artem-sedykh.github.io/mini-climate-card/)**,
and the same pages are in [`docs/`](https://github.com/artem-sedykh/mini-climate-card/tree/master/docs).

| | |
|---|---|
| [Configuration](https://github.com/artem-sedykh/mini-climate-card/blob/master/docs/configuration.md) | every card option, the toggle, and the theme variables |
| [Controls](https://github.com/artem-sedykh/mini-climate-card/blob/master/docs/controls.md) | temperature, target temperature, hvac mode, fan mode |
| [Indicators](https://github.com/artem-sedykh/mini-climate-card/blob/master/docs/indicators.md) | the read-only values under the entity name |
| [Buttons](https://github.com/artem-sedykh/mini-climate-card/blob/master/docs/buttons.md) | buttons and dropdowns of your own |
| [Tap action](https://github.com/artem-sedykh/mini-climate-card/blob/master/docs/tap-action.md) | what a tap does, with examples |
| [Secondary info](https://github.com/artem-sedykh/mini-climate-card/blob/master/docs/secondary-info.md) | the line under the name, and its types |
| [Examples](https://github.com/artem-sedykh/mini-climate-card/blob/master/docs/examples.md) | a complete configuration |
| [Development](https://github.com/artem-sedykh/mini-climate-card/blob/master/docs/development.md) | building the card, and what to do when it errors |

Links here are absolute on purpose: HACS renders this file outside GitHub and
resolves a relative path against a URL of its own, where it 404s.

## Contributing

[CONTRIBUTING.md](https://github.com/artem-sedykh/mini-climate-card/blob/master/CONTRIBUTING.md)
has what to know before opening a pull request, and
[AGENTS.md](https://github.com/artem-sedykh/mini-climate-card/blob/master/AGENTS.md)
is the long version: how the card is put together and what breaks it.

## License

This project is under the MIT license.
