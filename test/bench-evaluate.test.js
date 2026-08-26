import { describe, expect, it, vi } from 'vitest';
import { isTransient, readPage } from './bench/evaluate.mjs';

// The bench reads the page while the frontend may be navigating - opening a
// more-info dialog pushes a history entry, closing it pops one. A read that
// lands in that instant comes back as an error about a destroyed context, and
// on 2026-08-26 that failed a run on master while the card was fine.
//
// The retry is here rather than in the browser helpers so it can be tested
// without a browser: the interesting cases are what it repeats and, more
// importantly, what it refuses to.
const navigated = () =>
  new Error('page.evaluate: Execution context was destroyed, most likely because of a navigation');

describe('reading a page that may be navigating', () => {
  it('answers straight away when nothing is in the way', async () => {
    const page = { evaluate: vi.fn().mockResolvedValue('answer') };

    expect(await readPage(page, () => 'x')).toBe('answer');
    expect(page.evaluate).toHaveBeenCalledTimes(1);
  });

  it('asks again when the context was destroyed under it', async () => {
    const page = {
      evaluate: vi.fn().mockRejectedValueOnce(navigated()).mockResolvedValue('answer'),
    };

    expect(await readPage(page, () => 'x', undefined, { pause: 0 })).toBe('answer');
    expect(page.evaluate).toHaveBeenCalledTimes(2);
  });

  it('gives up rather than asking for ever', async () => {
    const page = { evaluate: vi.fn().mockRejectedValue(navigated()) };

    await expect(readPage(page, () => 'x', undefined, { attempts: 3, pause: 0 })).rejects.toThrow(
      /kept navigating/,
    );
    expect(page.evaluate).toHaveBeenCalledTimes(3);
  });

  it('throws anything that is not about navigation, first time', async () => {
    // The failure this must not hide: a scenario asking about an element that
    // is not there would otherwise be retried four times and then reported as
    // a navigation problem.
    const page = {
      evaluate: vi.fn().mockRejectedValue(new TypeError('root.querySelectorAll is not a function')),
    };

    await expect(readPage(page, () => 'x', undefined, { pause: 0 })).rejects.toThrow(TypeError);
    expect(page.evaluate).toHaveBeenCalledTimes(1);
  });

  it('recognises the wordings playwright uses, and no others', () => {
    expect(isTransient(navigated())).toBe(true);
    expect(isTransient(new Error('Target closed'))).toBe(true);
    expect(isTransient(new Error('frame was detached'))).toBe(true);
    expect(isTransient(new Error('Timeout 30000ms exceeded'))).toBe(false);
    expect(isTransient(new Error('strict mode violation'))).toBe(false);
  });
});
