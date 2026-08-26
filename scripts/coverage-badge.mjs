#!/usr/bin/env node
//
// Turns coverage/coverage-summary.json into the JSON shields.io reads.
//
//   npm run test:coverage
//   node scripts/coverage-badge.mjs coverage/badge.json
//
// CI runs this on master and force-pushes the result to the `badges` branch as
// coverage.json; README points shields at the raw file. That is the whole of
// the badge: no third-party service holding the number, and no credential
// beyond the GITHUB_TOKEN of the run that produced it.
//
// The number is line coverage of the unit layer, which is what the thresholds
// in vitest.config.mjs are set against - not of the card as a whole. The
// component layer renders the card in two browsers and reports separately, and
// `coverage.exclude` drops src/components/** from the vitest run for the reason
// written down there. A percentage that claimed to speak for both would be a
// number nobody could act on.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const summary = path.join(root, 'coverage', 'coverage-summary.json');
const target = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'coverage', 'badge.json');

// Anything that looks like "no data" has to stop here. A badge built from a
// missing or half-written summary is a green number that means nothing, and
// nothing downstream would notice - which is the same failure `check:bundle`
// guards against when it treats an empty list of components as a broken parse.
const read = () => {
  let raw;
  try {
    raw = readFileSync(summary, 'utf8');
  } catch {
    console.error(`Missing ${path.relative(root, summary)}. Run \`npm run test:coverage\` first.`);
    process.exit(1);
  }

  const total = JSON.parse(raw).total;
  const pct = total?.lines?.pct;
  if (typeof pct !== 'number' || Number.isNaN(pct)) {
    console.error(
      `No line coverage in ${path.relative(root, summary)}: got ${JSON.stringify(pct)}.`,
    );
    process.exit(1);
  }

  return pct;
};

// The scale every coverage badge uses, so the colour reads the way people
// expect it to rather than the way this repository feels about the number.
const colorFor = pct => {
  if (pct >= 90) return 'brightgreen';
  if (pct >= 80) return 'green';
  if (pct >= 70) return 'yellowgreen';
  if (pct >= 60) return 'yellow';
  if (pct >= 50) return 'orange';
  return 'red';
};

const pct = read();
const badge = {
  schemaVersion: 1,
  label: 'coverage',
  message: `${Math.round(pct)}%`,
  color: colorFor(pct),
};

writeFileSync(target, `${JSON.stringify(badge, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, target)}: ${badge.message} (${badge.color}).`);
