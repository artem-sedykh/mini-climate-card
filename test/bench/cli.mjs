// node test/bench/cli.mjs up|setup|down|status
//
// `up` and `down` drive docker compose and need docker on this machine.
// Everything else talks to whatever BENCH_URL points at, which is how a bench
// running on another host is used from here.
import { execFileSync } from 'node:child_process';
import { cp, rm, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BASE } from './auth.mjs';
import { prepare } from './setup.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const compose = (...args) =>
  execFileSync('docker', ['compose', ...args], { cwd: here, stdio: 'inherit' });

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const waitForHomeAssistant = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const res = await fetch(`${BASE}/api/onboarding`);
      if (res.ok) return;
    } catch {
      // Not up yet.
    }
    await wait(2000);
  }
  throw new Error(`${BASE} did not answer`);
};

const up = async ({ fresh }) => {
  const config = join(here, 'config');

  // A fresh instance means a fresh config: the entity registry, the dashboards
  // and the onboarding state all live in there, and a bench that keeps them
  // between runs is a bench whose state nobody can name.
  if (fresh) {
    await rm(config, { recursive: true, force: true });
    await mkdir(config, { recursive: true });
    await cp(join(here, 'config-seed'), config, { recursive: true });
  }

  compose('up', '-d');
  await waitForHomeAssistant();
};

const command = process.argv[2] || 'status';

if (command === 'up') {
  await up({ fresh: process.argv.includes('--keep') === false });
  const ready = await prepare();
  console.log(`bench ready: ${ready.dashboard}`);
  console.log(`entities: ${JSON.stringify(ready.ids)}`);
} else if (command === 'setup') {
  const ready = await prepare();
  console.log(`bench ready: ${ready.dashboard}`);
  console.log(`entities: ${JSON.stringify(ready.ids)}`);
} else if (command === 'down') {
  compose('down', '-v');
} else if (command === 'status') {
  const res = await fetch(`${BASE}/api/onboarding`).catch(() => null);
  console.log(res && res.ok ? `${BASE} is up` : `${BASE} is not answering`);
} else {
  console.error(`unknown command: ${command}`);
  process.exit(1);
}
