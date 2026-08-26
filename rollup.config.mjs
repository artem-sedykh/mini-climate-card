import { createRequire } from 'node:module';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import ignore from './rollup-plugins/ignore.mjs';

// `npm run dev` and `npm run watch` set this. An unminified bundle is far
// easier to debug in the browser, and it still loads in Home Assistant.
const development = process.env.BUILD === 'development';

// The mwc modules register their elements globally on import. The card puts
// its own copies in a scoped registry instead, so these are emptied - see
// src/components/mwc/.
const require = createRequire(import.meta.url);

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/mini-climate-card-bundle.js',
    format: 'umd',
    name: 'MiniClimate',
  },
  plugins: [
    // The export condition is pinned deliberately. Left to itself,
    // @rollup/plugin-node-resolve picks `development` or `production` from
    // whatever NODE_ENV happens to hold, so the same commit could produce a
    // different bundle here than in CI. lit ships a separate development
    // build behind that condition: it carries assertions and warnings that
    // are useful while developing and must not reach users.
    //
    // This did not arise before: the resolver this replaces predates the
    // `exports` field and could not reach that build at all.
    //
    // No `dedupe` here, deliberately. It would collapse the four copies of
    // lit 2 that @material/mwc-* drag in - onto lit 3, a different major than
    // those packages were built against. The copies go when the packages do.
    nodeResolve({ exportConditions: [development ? 'development' : 'production'] }),
    json(),
    ignore({
      files: [
        '@material/mwc-menu/mwc-menu-surface.js',
        '@material/mwc-ripple/mwc-ripple.js',
        '@material/mwc-list/mwc-list.js',
        '@material/mwc-list/mwc-list-item.js',
      ].map(file => require.resolve(file)),
    }),
    ...(development ? [] : [terser({ format: { comments: false } })]),
  ],
};
