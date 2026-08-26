#!/usr/bin/env node
//
// Every option the card reads is documented, and every option the
// documentation names is read.
//
// `check-docs-paths.mjs` answers "does this file exist"; this answers "does
// this option exist, and does anybody say so". They are different failures:
// a path rots when a file moves, an option rots when the code and the prose
// stop agreeing - which is quieter and lasts longer. `collapse` was declared
// and read from the first commit of this repository, was never styled by
// anything, and appeared in no documentation for six years.
//
//   npm run check:options
//
// An option that is deliberately undocumented goes in IGNORED with its reason,
// not into a widened rule.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(root, file), 'utf8');

const IGNORED = new Map([
  ['entity', 'named on every page as the one required option; not a row of its own everywhere'],
]);

// The card's own options, as the types declare them. `RawCardConfig` is what a
// user's YAML is allowed to be, so it is the list to hold the documentation
// against.
const configKeys = () => {
  const types = read('src/types.ts');
  const block = types.match(/export interface RawCardConfig \{([\s\S]*?)\n\}/);

  if (!block) throw new Error('RawCardConfig is not in src/types.ts any more');

  return [...block[1].matchAll(/^\s{2}([a-z_]+)\??:/gm)].map(match => match[1]);
};

// What `secondary_info: { type: ... }` accepts, as the component switches on it.
const secondaryTypes = () => {
  const component = read('src/components/secondary-info.ts');
  const cases = [...component.matchAll(/case '([a-z-]+)':/g)].map(match => match[1]);

  if (cases.length === 0) throw new Error('no secondary info types found - did the switch go?');

  return cases;
};

const docsFiles = readdirSync(path.join(root, 'docs'))
  .filter(name => name.endsWith('.md'))
  .map(name => `docs/${name}`);

const documentation = [...docsFiles, 'README.md'].map(read).join('\n');
const source = readdirSync(path.join(root, 'src'), { recursive: true })
  .filter(name => String(name).endsWith('.ts'))
  .map(name => read(path.posix.join('src', String(name).split(path.sep).join('/'))))
  .join('\n');

// Word-for-word rather than substring: `hvac-mode` must be documented as
// itself and not be satisfied by `hvac-mode-dropdown` appearing somewhere.
// Split rather than a boundary expression, because the names carry both
// underscores and hyphens and a boundary treats the two differently.
const words = text => new Set(text.split(/[^A-Za-z0-9_-]+/));
const mentioned = (haystack, name) => words(haystack).has(name);

const problems = [];
let checked = 0;

for (const key of configKeys()) {
  checked += 1;
  if (IGNORED.has(key)) continue;
  if (!mentioned(documentation, key))
    problems.push(`option \`${key}\` is read by the card and documented nowhere`);
}

for (const type of secondaryTypes()) {
  checked += 1;
  if (!mentioned(documentation, type)) {
    problems.push(`secondary_info type \`${type}\` is accepted by the card and documented nowhere`);
  }
}

// The other direction. The option table in configuration.md is the list a
// reader trusts, so a row naming something the code never reads is worse than
// a missing row: it describes a card that does not exist.
const table = read('docs/configuration.md')
  .split('\n')
  .filter(line => /^\| [a-z_]+ +\|/.test(line))
  .map(line => line.split('|')[1].trim());

for (const option of new Set(table)) {
  checked += 1;
  if (option === 'type') continue;
  if (!mentioned(source, option))
    problems.push(`\`${option}\` is documented and the card never reads it`);
}

console.log(`Checking ${checked} options named by the card and by its documentation`);

// A check that stopped finding anything would pass in silence.
if (checked < 20) {
  console.error(`only ${checked} options checked - the expressions above have stopped matching`);
  process.exit(1);
}

if (problems.length) {
  console.error('\n' + problems.map(problem => `  ${problem}`).join('\n') + '\n');
  process.exit(1);
}

console.log('Every option the card reads is documented, and the other way round.');
