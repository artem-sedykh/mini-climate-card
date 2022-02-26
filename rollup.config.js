import resolve from 'rollup-plugin-node-resolve';
import json from '@rollup/plugin-json';
import ignore from './rollup-plugins/ignore';

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/mini-climate-card-bundle.js',
    format: 'umd',
    name: 'MiniClimate',
  },
  plugins: [
    resolve(),
    json(),
    ignore({
      files: [
        '@material/mwc-menu/mwc-menu-surface.js',
        '@material/mwc-ripple/mwc-ripple.js',
        '@material/mwc-list/mwc-list.js',
        '@material/mwc-list/mwc-list-item.js',
      ].map(file => require.resolve(file)),
    }),
  ],
};
