import resolve from 'rollup-plugin-node-resolve';
import json from '@rollup/plugin-json';

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
  ],
};
