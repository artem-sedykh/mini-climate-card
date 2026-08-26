import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import esbuild from 'rollup-plugin-esbuild';

// `npm run dev` and `npm run watch` set this. An unminified bundle is far
// easier to debug in the browser, and it still loads in Home Assistant.
const development = process.env.BUILD === 'development';

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/mini-climate-card-bundle.js',
    format: 'umd',
    name: 'MiniClimate',
    // Development only, and deliberately so. The bench's coverage report maps
    // what the browser executed back to src/ through this map, and the
    // release bundle has to stay exactly what it was: a map there would add a
    // file beside it and a comment inside it, which `check:bundle` measures.
    sourcemap: development,
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
    nodeResolve({
      // Local imports are written without an extension and the whole of src/
      // is TypeScript, so `.ts` has to be in this list - node's own defaults
      // do not include it.
      extensions: ['.mjs', '.js', '.json', '.node', '.ts'],
      exportConditions: [development ? 'development' : 'production'],
    }),
    json(),
    // Types are stripped here and checked separately by `npm run typecheck`;
    // esbuild does not check them itself. The TypeScript compiler's own rollup
    // plugin reads an API the 7.x native port no longer exposes, and esbuild
    // is already in the tree for the browser tests, so both languages go
    // through one tool.
    //
    esbuild({ include: /\.ts$/, target: 'es2021', tsconfig: './tsconfig.json' }),
    ...(development ? [] : [terser({ format: { comments: false } })]),
  ],
};
