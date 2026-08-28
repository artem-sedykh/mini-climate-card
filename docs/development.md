# Development

[Home](../README.md) | [Configuration](configuration.md) | [Controls](controls.md) | [Indicators](indicators.md) | [Buttons](buttons.md) | [Functions](functions.md) | [Tap action](tap-action.md) | [Secondary info](secondary-info.md) | [Examples](examples.md) | [Development](development.md) | [Visual editor](visual-editor-parameters.md)

*If you plan to contribute back to this repo, please fork & create the PR against the [dev](https://github.com/artem-sedykh/mini-climate-card/tree/dev) branch.*

**Clone this repository into your `config/www` folder using git.**

 ```console
$ git clone https://github.com/artem-sedykh/mini-climate-card.git
```

**Add a reference to the card in your `ui-lovelace.yaml`.**

```yaml
resources:
  - url: /local/mini-climate-card/dist/mini-climate-card-bundle.js
    type: module
```

## Instructions

*Requires `nodejs` & `npm`*

1. Move into the `mini-climate-card` repo, checkout the *dev* branch & install dependencies.
```console
$ cd mini-climate-card && git checkout dev && npm install
```

2. Make changes to the source

3. Build the source by running
```console
$ npm run build
```

4. Refresh the browser to see changes

    *Make sure cache is cleared or disabled*

5. *(Optional)* Watch the source and automatically rebuild on save
```console
$ npm run watch
```

*The new `mini-climate-card-bundle.js` will be build and ready inside `/dist`.*

## Getting errors?
Make sure you have `javascript_version: latest` in your `configuration.yaml` under `frontend:`.

Make sure you have the latest version of `mini-climate-card-bundle.js`.

If you have issues after updating the card, try clearing your browsers cache or restart Home Assistant.

If you are getting "Custom element doesn't exist: mini-climate" or running older browsers try replacing `type: module` with `type: js` in your resource reference, like below.

```yaml
resources:
  - url: ...
    type: js
```
