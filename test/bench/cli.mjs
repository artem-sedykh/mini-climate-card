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
import { DASHBOARD, prepare } from './setup.mjs';

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

// One picture per card on the dashboard, plus the dashboard itself. This is
// the other half of what the bench is for: an answer to "the layout is off"
// that is a screenshot rather than a paragraph.
const shot = async () => {
  const { open } = await import('./browser.mjs');
  const { mkdir } = await import('node:fs/promises');
  const directory = process.env.BENCH_SHOTS || 'test/e2e/shots';

  await mkdir(directory, { recursive: true });
  const ready = await prepare();
  const session = await open(ready.tokens);

  await session.page.goto(`${BASE}/${DASHBOARD}/0`, { waitUntil: 'load' });
  await session.page.waitForSelector('mini-climate', { timeout: 60000 });
  await session.page.waitForTimeout(1500);

  await session.page.screenshot({ path: `${directory}/dashboard.png` });

  const all = session.page.locator('mini-climate');
  const count = await all.count();

  for (let index = 0; index < count; index += 1) {
    await all.nth(index).screenshot({ path: `${directory}/card-${index + 1}.png` });
  }
  await session.browser.close();

  console.log(`${count + 1} screenshots in ${directory}`);
  if (session.errors.length) console.log(`page errors: ${JSON.stringify(session.errors)}`);
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
} else if (command === 'shot') {
  await shot();
} else if (command === 'down') {
  compose('down', '-v');
} else if (command === 'status') {
  const res = await fetch(`${BASE}/api/onboarding`).catch(() => null);
  console.log(res && res.ok ? `${BASE} is up` : `${BASE} is not answering`);
} else {
  console.error(`unknown command: ${command}`);
  process.exit(1);
}
