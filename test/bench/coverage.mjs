// What the bench scenarios actually execute, mapped back to src/.
//
// A diagnostic, not a metric. It is not a threshold, it does not feed the
// badge, and it is not comparable with `npm run test:coverage`: that number is
// the unit layer, and one percentage speaking for both layers would be a
// number nobody could act on. What this answers is narrower and more useful -
// which parts of the card a browser driving a real dashboard never reaches.
//
//   npm run dev            # unminified, with the sourcemap this needs
//   npm run bench up
//   npm run bench:coverage
//
// The unminified build is why this is a separate run: what ships is the
// minified one, and the scenarios normally exercise that.
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
// The istanbul keys are local file paths, so the separator is the platform's.
import { sep } from 'node:path';
import v8toIstanbul from 'v8-to-istanbul';

const BUNDLE = 'dist/mini-climate-card-bundle.js';
const DIRECTORY = process.env.BENCH_COVERAGE_DIR || 'test/e2e/coverage';

const IGNORED = new Set([
  'src/style.ts',
  'src/sharedStyle.ts',
  'src/const.ts',
  'src/initialize.ts',
]);

const run = () => {
  const result = spawnSync(
    process.execPath,
    ['--test', '--test-concurrency=1', 'test/e2e/*.test.mjs'],
    { stdio: 'inherit', env: { ...process.env, BENCH_COVERAGE: '1' } },
  );
  return result.status ?? 1;
};

const report = async () => {
  const source = await readFile(BUNDLE, 'utf8');

  if (!existsSync(`${BUNDLE}.map`)) {
    console.error(`no ${BUNDLE}.map - build with \`npm run dev\`, which emits one`);
    return 1;
  }
  const sourcemap = JSON.parse(await readFile(`${BUNDLE}.map`, 'utf8'));

  const files = (await readdir(DIRECTORY)).filter(name => name.endsWith('.json'));
  if (files.length === 0) {
    console.error(`nothing in ${DIRECTORY} - did the scenarios run?`);
    return 1;
  }

  // Counts are summed across sessions rather than taken from the last one:
  // each scenario file drives its own browser, and a line one of them reaches
  // is a line the bench reaches.
  const totals = new Map();

  for (const name of files) {
    const entries = JSON.parse(await readFile(`${DIRECTORY}/${name}`, 'utf8'));

    for (const entry of entries) {
      const converter = v8toIstanbul(BUNDLE, 0, { source, sourceMap: { sourcemap } });
      await converter.load();
      converter.applyCoverage(entry.functions);

      for (const [path, coverage] of Object.entries(converter.toIstanbul())) {
        const key = path
          .split(sep)
          .join('/')
          .replace(/^.*\/src\//, 'src/');

        // Styles, constants and the console banner are data: every statement
        // in them runs the moment the bundle is parsed, so they would sit at
        // 100% in this table and say nothing. The components stay - they are
        // the whole point here, and the unit layer excludes them for the
        // opposite reason.
        if (!key.startsWith('src/')) continue;
        if (IGNORED.has(key)) continue;

        const counts = totals.get(key) || new Map();

        for (const [statement, hits] of Object.entries(coverage.s)) {
          counts.set(statement, (counts.get(statement) || 0) + hits);
        }
        totals.set(key, counts);
      }
      converter.destroy();
    }
  }

  const rows = [...totals.entries()]
    .map(([file, counts]) => {
      const statements = [...counts.values()];
      const covered = statements.filter(hits => hits > 0).length;
      return { file, covered, total: statements.length };
    })
    .filter(row => row.total > 0)
    .sort((a, b) => a.covered / a.total - b.covered / b.total);

  const width = Math.max(...rows.map(row => row.file.length));
  console.log('\nWhat the bench scenarios executed, mapped back to src/:\n');

  for (const row of rows) {
    const share = Math.round((row.covered / row.total) * 100);
    console.log(
      `  ${row.file.padEnd(width)}  ${String(share).padStart(3)}%  ${row.covered}/${row.total}`,
    );
  }

  const sum = rows.reduce(
    (into, row) => ({ covered: into.covered + row.covered, total: into.total + row.total }),
    { covered: 0, total: 0 },
  );
  console.log(
    `\n  ${'total'.padEnd(width)}  ${String(Math.round((sum.covered / sum.total) * 100)).padStart(3)}%  ${sum.covered}/${sum.total}`,
  );
  console.log('\nA diagnostic, not a threshold: nothing fails on these numbers.\n');

  await writeFile(`${DIRECTORY}/summary.json`, JSON.stringify(rows, null, 2));
  return 0;
};

await rm(DIRECTORY, { recursive: true, force: true });
await mkdir(DIRECTORY, { recursive: true });

const status = run();
if (status !== 0)
  console.error('\nthe scenarios did not all pass - the report below covers what ran');

process.exit(await report());
