#!/usr/bin/env node
//
// Every path named in the documentation either exists or is listed here with
// the reason it does not.
//
// Nothing reads the prose. Six paths in AGENTS.md ended in `.js` from the
// TypeScript migration until #244 fixed them by hand - three of them bare file
// names inside a fenced tree - and no check in this repository had an opinion
// about any of it. `mkdocs build --strict` does not cover this: it validates
// the links between pages of the site, not the paths a sentence names, and it
// never sees AGENTS.md or CONTRIBUTING.md at all.
//
//   npm run check:docs
//
// A path that is named because it is absent, or that only exists after a
// build, goes in IGNORED with its reason - not into a widened rule.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const IGNORED = new Map([
  ['dist/mini-climate-card-bundle.js', 'the build output, absent from a clean tree'],
  ['mini-climate-card-bundle.js', 'the build output, absent from a clean tree'],
  ['docs/index.md', 'written from README.md by the mkdocs hook at build time'],
  ['docs/whatever.md', 'a placeholder in an example'],
  ['info.md', 'the dead HACS convention, named here because it is absent'],
  ['/local/mini-climate-card-bundle.js', "a resource URL on the reader's Home Assistant"],
  [
    '/local/mini-climate-card/dist/mini-climate-card-bundle.js',
    "a resource URL on the reader's Home Assistant",
  ],
]);

// Release notes are a record of a released version, not a description of the
// tree: `getLabel.js` was the file's name when v2.7.4 shipped, and correcting
// it there would make the note say something that was never true.
const SKIPPED_MARKDOWN = 'release_notes/';

// Nothing tracked lives under these.
const SKIPPED_DIRS = new Set(['node_modules', 'dist', '.git', 'site', 'coverage']);

// The extensions this repository owns. `.yaml` is deliberately not among them:
// the workflows here are `.yml`, and every `.yaml` in the documentation is the
// reader's Home Assistant configuration rather than a file in this tree.
const CANDIDATE = /[A-Za-z0-9_./-]+\.(?:ts|js|mjs|json|yml|md)\b/g;

const walk = dir => {
  const found = [];

  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) found.push(...walk(rel));
    } else {
      found.push(rel);
    }
  }

  return found;
};

const files = walk('');
const markdown = files.filter(file => file.endsWith('.md') && !file.startsWith(SKIPPED_MARKDOWN));
const basenames = new Set(files.map(file => path.posix.basename(file)));
const known = new Set(files);

// A path written in a sentence carries the punctuation around it, and the
// bundle is referenced with a cache-busting query string.
const clean = token =>
  token
    .replace(/^\.\//, '')
    .replace(/[).,:;]+$/, '')
    .split('?')[0];

const resolves = (token, from) => {
  if (IGNORED.has(token)) return true;

  // A name with no directory in front of it is checked against the tree by
  // basename: that is how `style.js` and `sharedStyle.js` were written in the
  // Layout section, and how they went wrong.
  if (!token.includes('/')) return basenames.has(token);

  // Relative first, because a page in docs/ links its neighbours and the
  // README as `../README.md`.
  const relative = path.posix.normalize(path.posix.join(path.posix.dirname(from), token));

  return known.has(relative) || known.has(token);
};

const problems = [];
let checked = 0;

for (const file of markdown) {
  // URLs go first, or the path inside every github.com link is a candidate.
  const text = readFileSync(path.join(root, file), 'utf8').replace(/https?:\/\/\S+/g, '');
  const seen = new Set();

  for (const match of text.matchAll(CANDIDATE)) {
    const token = clean(match[0]);

    if (!token || token.includes('*') || token.includes('<') || seen.has(token)) continue;
    seen.add(token);

    checked += 1;
    if (!resolves(token, file)) problems.push({ file, token });
  }
}

console.log(
  `Checking ${checked} paths named in ${markdown.length} markdown files` +
    ` against ${files.length} tracked paths`,
);

// An expression that stopped matching would leave this reporting success while
// checking nothing - the same failure the bundle assertions guard against by
// refusing an empty component list. The documentation has never named fewer
// than a hundred paths.
if (checked < 50) {
  console.error(`\nOnly ${checked} paths matched. The candidate expression is broken.`);
  process.exit(1);
}

if (problems.length > 0) {
  for (const { file, token } of problems) console.error(`  FAIL  ${file}: ${token}`);

  console.error(
    `\n${problems.length} path${problems.length === 1 ? '' : 's'} named in the documentation` +
      ` do${problems.length === 1 ? 'es' : ''} not exist. Fix the text, or add the path to` +
      ' IGNORED with the reason it is absent.',
  );
  process.exit(1);
}

console.log(`\nEvery path named in the documentation exists (${IGNORED.size} listed as absent).`);
