import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    // The default environment is node. The three files that need a DOM ask for
    // jsdom with a `@vitest-environment` docblock of their own, so the rest do
    // not pay for it.
    environment: 'node',
    // The unit layer only. test/browser/ is the component layer and runs in
    // real browsers under @web/test-runner - under jsdom those files would
    // fail on the first thing they are there to check.
    exclude: [...configDefaults.exclude, 'test/browser/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary'],
      include: ['src/**/*.ts'],
      // What this layer cannot reach, with the reason:
      exclude: [
        // Components render in a browser. Under vitest only their import-time
        // code would run, which measures nothing and reports a number that
        // looks like coverage.
        'src/components/**',
        // Styles and constants are data.
        'src/style.ts',
        'src/sharedStyle.ts',
        'src/const.ts',
        // A console banner.
        'src/initialize.ts',
      ],
      thresholds: {
        // Set to what the suite reaches today, not to a round number, so they
        // say "this must not slide" rather than "aim here". Raise them when
        // coverage rises.
        //
        // `src/main.ts` used to hold this down at 68%. What was missing was
        // not the drawing but the deciding - the classes, the styles, the
        // name, what a press does, the two sources filled after the first
        // update, and what the card picker inserts. All of that answers plain
        // objects and events, so it is unit-testable, and it is now at 86%.
        //
        // What is left there is the render methods, and they stay left: they
        // name Home Assistant elements that exist only in a browser, and
        // `test/browser/` renders them in two engines. Chasing those last
        // points here would mean asserting on lit templates instead of on
        // what a card draws.
        statements: 88,
        branches: 79,
        functions: 81,
        lines: 89,
      },
    },
  },
});
