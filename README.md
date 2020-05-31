# Mini Climate Card

A minimalistic yet customizable climate card for [Home Assistant](https://github.com/home-assistant/home-assistant) Lovelace UI.

![Preview Image](https://user-images.githubusercontent.com/861063/83363491-98b13080-a3a2-11ea-90e6-1ba6364c800d.png)

## Install

*This card is available in [HACS](https://github.com/custom-components/hacs) (Home Assistant Community Store)*

### Simple install

1. Download and copy `mini-climate-card-bundle.js` from the [latest release](https://github.com/artem-sedykh/mini-climate-card/releases/latest) into your `config/www` directory.

2. Add a reference to `mini-climate-card-bundle.js` inside your `ui-lovelace.yaml`.

  ```yaml
  resources:
    - url: /local/mini-climate-card-bundle.jss?v=1.0.1
      type: module
  ```

### CLI install

1. Move into your `config/www` directory

2. Grab `mini-climate-card-bundle.js`

  ```console
  $ wget https://github.com/artem-sedykh/mini-climate-card/releases/download/v1.0.1/mini-climate-card-bundle.js
  ```

3. Add a reference to `mini-climate-card-bundle.js` inside your `ui-lovelace.yaml`.

  ```yaml
  resources:
    - url: /local/mini-climate-card-bundle.js?v=1.0.1
      type: module
  ```

## Updating
1. Find your `mini-climate-card-bundle.js` file in `config/www` or wherever you ended up storing it.

2. Replace the local file with the latest one attached in the [latest release](https://github.com/artem-sedykh/mini-climate-card/releases/latest).

3. Add the new version number to the end of the cards reference url in your `ui-lovelace.yaml` like below.

  ```yaml
  resources:
    - url: /local/mini-climate-card-bundle.js?v=1.0.1
      type: module
  ```

*You may need to empty the browsers cache if you have problems loading the updated card.*

## Using the card

### Options

#### Card options
