import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';

// `npm run dev` and `npm run watch` set this. An unminified bundle is far
// easier to debug in the browser, and it still loads in Home Assistant.
const development = process.env.BUILD === 'development';

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
    // No `dedupe`: with @material/mwc-* gone there is one copy of lit in the
    // tree, and `npm run check:bundle` asserts exactly that.
    nodeResolve({ exportConditions: [development ? 'development' : 'production'] }),
    json(),
    ...(development ? [] : [terser({ format: { comments: false } })]),
  ],
};
