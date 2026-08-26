// Flat config (ESLint 10). Replaces the .eslintrc.yml + airbnb-base setup:
// airbnb-base is pinned to the legacy config format and to ESLint 8, which is
// what held this repository on ESLint 5.
//
// Formatting is not ESLint's job here - prettier owns it, and
// eslint-config-prettier switches off every stylistic rule that would fight
// it. What is left are the rules that catch real mistakes. That is the whole
// difference from airbnb-base, most of which was style.

const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

const rules = {
  eqeqeq: ['error', 'smart'],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  // The card compiles the templates a user wrote in their Lovelace config, so
  // one deliberate `new Function` stays - guarded by a disable comment in
  // src/utils/utils.js. Everything else has to justify itself the same way.
  'no-new-func': 'error',
  'no-unused-vars': ['error', { args: 'after-used', ignoreRestSiblings: true }],
};

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    rules,
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      // Browser globals for the files that ask for a jsdom environment, node
      // globals for the rest. vitest's own helpers are imported, not global.
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules,
  },
  {
    // The component layer runs in real browsers under @web/test-runner, whose
    // test framework is mocha - `describe` and `it` arrive as globals there,
    // where vitest's are imported.
    files: ['test/browser/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.mocha,
      },
    },
    rules,
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      ...rules,
      // These scripts exist to report to the terminal.
      'no-console': 'off',
    },
  },
  prettier,
];
