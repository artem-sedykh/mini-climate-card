#!/usr/bin/env node
//
// Assertions on the built bundle.
//
// Nothing else in this repository looks at what users actually download. The
// build succeeding is not evidence: it succeeds today for a bundle carrying
// five copies of lit. In the sister card every regression that ever reached
// users lived in the build rather than in the source - lit's development build,
// a duplicated @lit/reactive-element, a directive left unresolved and emitted
// as an external require - and a unit test over the source would have caught
// none of them. All of them are visible in the output file.
//
// Run after `npm run rollup`:
//
//   npm run check:bundle
//
// The baseline lives in scripts/bundle-baseline.json. When a change
// legitimately moves the size past the tolerance, update that file in the same
// commit and say why - that is the point of it being tracked rather than
// computed. Do not widen the tolerance to make a build pass.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'dist', 'mini-climate-card-bundle.js');

const read = file => readFileSync(file, 'utf8');

let bundle;
try {
  bundle = read(bundlePath);
} catch {
  console.error(`No bundle at ${path.relative(root, bundlePath)}. Run \`npm run rollup\` first.`);
  process.exit(1);
}

const baseline = JSON.parse(read(path.join(root, 'scripts', 'bundle-baseline.json')));

// The component ids are read out of the source rather than imported: these are
// ES modules with lit in them, so node cannot load them. Every component
// declares its own tag in a static `defineId`, so the directory is the list -
// nothing to keep in step by hand.
//
// An empty list is treated as a broken parser rather than a passing build.
// `every` over an empty list is true, so without this guard a parse that stops
// matching would leave the check reporting ok while checking nothing at all.
const componentIds = (() => {
  const dir = path.join(root, 'src', 'components');
  const ids = [];

  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;

    const source = read(path.join(entry.parentPath, entry.name));
    const match = source.match(/get defineId\(\)\s*{\s*return\s*'([^']+)'/);

    if (match) ids.push(match[1]);
  }

  if (ids.length === 0) {
    console.error('Read no component ids out of src/components - this parse is out of date.');
    process.exit(1);
  }

  return ids;
})();

// lit registers its version once per copy: `(x.litHtmlVersions ??= []).push(...)`,
// which the minifier rewrites into a form that mentions the name twice. Only
// the assignment is followed directly by `).push(`, so counting that pattern
// counts copies, while counting the bare identifier would also count the read.
const countVersionRegistrations = name => {
  let count = 0;
  let from = 0;

  for (;;) {
    const at = bundle.indexOf(name, from);
    if (at === -1) return count;

    from = at + name.length;
    const tail = bundle.slice(from, from + 40);
    const close = tail.indexOf(')');
    if (close === -1) continue;

    // Skip the run of closing parens, however many the build happens to have:
    // the minified form is `x=[]).push(`, the unminified one `x = [])).push(`.
    let after = close;
    while (tail[after] === ')') after += 1;

    if (tail.slice(after).startsWith('.push(')) count += 1;
  }
};

const litPackages = Object.keys(baseline.litCopies);
const litCounts = () => litPackages.map(name => [name, countVersionRegistrations(name)]);

const bytes = Buffer.byteLength(bundle);
const tolerated = Math.round(baseline.bytes * baseline.tolerance);

const checks = [
  {
    name: 'bundle is not empty',
    ok: () => bytes > 0,
    detail: () => 'the file is empty',
  },
  {
    name: 'registers the mini-climate element',
    ok: () => /customElements\.define\(\s*['"]mini-climate['"]/.test(bundle),
    detail: () => 'customElements.define("mini-climate", ...) is missing',
  },
  {
    name: 'registers itself with the card picker',
    // Without this the card works but cannot be found: it never appears in
    // "Add card", and the only way to use it is to know the type string.
    ok: () => bundle.includes('customCards'),
    detail: () => 'window.customCards.push(...) is missing',
  },
  {
    name: 'every component is bundled',
    // A component that does not reach the bundle is a control that silently is
    // not there - the card renders, with a hole in it.
    ok: () => componentIds.every(id => bundle.includes(id)),
    detail: () => `missing: ${componentIds.filter(id => !bundle.includes(id)).join(', ')}`,
  },
  {
    name: 'no unresolved externals',
    // Anything rollup fails to resolve is treated as external and survives into
    // the UMD wrapper as a require() call, which no browser answers.
    ok: () => !bundle.includes('require('),
    detail: () => {
      const specifiers = [...bundle.matchAll(/require\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
      return specifiers.length ? `left as external: ${specifiers.join(', ')}` : 'require() present';
    },
  },
  {
    name: 'not a development build of lit',
    // The development export carries assertions and warnings that are useful
    // while developing and must not reach users. It announces itself.
    ok: () => !bundle.includes('Lit is in dev mode'),
    detail: () => 'built with the development export condition',
  },
  {
    name: 'exactly one copy of each lit package',
    // It was five until @material/mwc-* went: one lit 3 for the card, plus a
    // full lit 2 per package, each resolving its own nested copy. Two
    // ReactiveElement classes in one bundle break the update cycle - the card
    // dispatches a change per duplicated lifecycle, and the device sees
    // several identical service calls.
    //
    // The baseline still carries the numbers so this reads as one rule with
    // the others rather than as a special case; they are all 1.
    ok: () => litCounts().every(([name, n]) => n === baseline.litCopies[name]),
    detail: () =>
      litCounts()
        .map(([name, n]) => `${name}: ${n} (expected ${baseline.litCopies[name]})`)
        .join(', '),
  },
  {
    name: 'the template engine survived',
    // Every templated option in every user's card is a string compiled with
    // this one `new Function`. If a transform ever eats it - inlining it,
    // rewriting it, dropping it as dead code - the card still loads and still
    // renders, and every template silently stops working. Nothing else here
    // would notice: the size barely moves and every other check passes.
    ok: () => bundle.includes('new Function('),
    detail: () => 'compileTemplate lost its `new Function`',
  },
  {
    name: 'size is within the baseline tolerance',
    ok: () => Math.abs(bytes - baseline.bytes) <= tolerated,
    detail: () =>
      `${bytes} bytes against a baseline of ${baseline.bytes} +/- ${tolerated}` +
      ` (${bytes > baseline.bytes ? '+' : ''}${bytes - baseline.bytes})`,
  },
];

console.log(
  `Checking ${path.relative(root, bundlePath)} (${bytes} bytes, ${componentIds.length} components)`,
);

let failed = 0;

for (const check of checks) {
  const passed = check.ok();
  if (!passed) failed += 1;
  console.log(
    `  ${passed ? 'ok  ' : 'FAIL'}  ${check.name}${passed ? '' : ` - ${check.detail()}`}`,
  );
}

if (failed > 0) {
  console.error(`\n${failed} bundle check${failed === 1 ? '' : 's'} failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} bundle checks passed.`);
