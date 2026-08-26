import rollupJson from '@rollup/plugin-json';
import { fromRollup } from '@web/dev-server-rollup';
import { playwrightLauncher } from '@web/test-runner-playwright';

// `src/initialize.js` reads the version out of package.json. Rollup handles
// that import in the bundle; the dev server that serves the sources to the
// browser needs the same plugin, or the import arrives as a JSON document the
// browser refuses to run.
const json = fromRollup(rollupJson);

export default {
  files: 'test/browser/**/*.test.js',
  nodeResolve: {
    // Every local import in src/ is written without an extension.
    extensions: ['.mjs', '.js', '.json', '.node'],
    // The same conditions rollup.config.mjs pins. Without them the choice
    // between lit's development and production builds depends on NODE_ENV,
    // and the tests would not be running the code the bundle ships.
    exportConditions: ['browser', 'production'],
    dedupe: ['lit', 'lit-html', 'lit-element', '@lit/reactive-element'],
  },
  // @web/dev-server-rollup only runs a rollup plugin over what it already
  // considers JavaScript, so the JSON has to be declared as such first.
  mimeTypes: { '**/*.json': 'js' },
  plugins: [json({ include: ['**/*.json'] })],
  // No polyfill and no page of its own: since #217 the card registers its
  // elements globally, so these tests run against the same registry a browser
  // gives it inside Home Assistant. Before that a browser test would have had
  // to load @webcomponents/scoped-custom-element-registry and would then have
  // been testing a page no user has.
  //
  // Two engines, not one. The Home Assistant companion app on iOS renders in
  // WKWebView, and nothing had ever run this card there. WebKit is also the
  // only second engine a CI runner can install, which makes it the cheapest
  // evidence available that the card is not written against Blink in
  // particular.
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    playwrightLauncher({ product: 'webkit' }),
  ],
  testFramework: {
    config: {
      // mocha's default of 2000ms is a fast-machine default. Two engines share
      // a CI runner, and WebKit on Linux is the slow one - a test that is
      // merely slow there would report as a broken card. A test that hangs
      // still fails.
      timeout: '10000',
    },
  },
};
