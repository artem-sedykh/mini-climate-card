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
      // Both languages while the migration in #228 is under way: a file that
      // moves to TypeScript must not fall out of the measurement, or the
      // thresholds below would slide without anyone touching a test.
      include: ['src/**/*.{js,ts}'],
      // What this layer cannot reach, with the reason:
      exclude: [
        // Components render in a browser. Under vitest only their import-time
        // code would run, which measures nothing and reports a number that
        // looks like coverage.
        'src/components/**',
        // Styles and constants are data.
        'src/style.js',
        'src/sharedStyle.js',
        'src/const.ts',
        // A console banner.
        'src/initialize.js',
      ],
      thresholds: {
        // Set to what the suite reaches today, not to a round number, so they
        // say "this must not slide" rather than "aim here". Raise them when
        // coverage rises.
        //
        // The number is held down by src/main.js, which is at 68%: half of it
        // is render methods that only run in a browser. The models, which are
        // where a wrong attribute or a crossed argument hides, are at 95%.
        statements: 82,
        branches: 74,
        functions: 72,
        lines: 83,
      },
    },
  },
});
