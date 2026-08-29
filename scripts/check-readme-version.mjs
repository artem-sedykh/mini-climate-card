#!/usr/bin/env node
//
// The version in README.md is the one this repository is at, and the download
// link is not pinned to a release that has been superseded.
//
// Both halves rot silently. The `?v=` in the install instructions was `2.21`
// and `2.2.1` for the whole of 3.x - and that number is not decoration: the
// files live in `/local`, which Home Assistant serves with a month-long
// `max-age`, so it is the only cache-buster a person has. Copying an old one
// from the README means the next update to the card does not reach the
// browser, which looks exactly like the update doing nothing.
//
// The `wget` line was worse: it named `v2.2.1` explicitly, so following the
// CLI instructions in 2026 downloaded a bundle from 2022.
//
//   npm run check:version
//
// Run as part of `npm run build`, which is why the release bump cannot forget
// the README: the build fails until the two agree.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(root, file), 'utf8');

const version = JSON.parse(read('package.json')).version.replace(/^v/, '');
const readme = read('README.md');

const problems = [];

// Every cache-buster in the instructions, as written.
const busters = [...readme.matchAll(/\?v=([\w.-]+)/g)].map(match => match[1]);

if (busters.length === 0) {
  problems.push('no `?v=` in README.md at all - the install instructions lost their cache-buster');
}

for (const found of new Set(busters)) {
  if (found !== version) {
    problems.push(`README.md says \`?v=${found}\`, package.json says ${version}`);
  }
}

// A download URL pinned to a release, rather than to whichever is latest.
const pinned = [...readme.matchAll(/releases\/download\/(v?[\w.]+)\//g)].map(match => match[1]);

for (const tag of new Set(pinned)) {
  problems.push(
    `README.md links releases/download/${tag}/ - use releases/latest/download/ so it cannot go stale`,
  );
}

console.log(`Checking ${busters.length} version references in README.md against ${version}`);

if (problems.length) {
  console.error('\n' + problems.map(problem => `  ${problem}`).join('\n') + '\n');
  process.exit(1);
}

console.log('README.md names the version this repository is at.');
