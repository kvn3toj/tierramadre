import { describe, it, expect, vi } from 'vitest';
import { isChunkLoadError } from '../src/utils/chunkErrors';
import { lazyWithRetry } from '../src/utils/lazyWithRetry';

/**
 * Regression tests for the "Nueva versión disponible" loop.
 *
 * Reported 2026-08-05 from an iPhone. Console showed:
 *   [lazyWithRetry] TreasureBrowser failed after all retries
 *   TypeError: Importing a module script failed.
 *
 * Production was healthy: the TreasureBrowser chunk and all 35 of its
 * dependencies returned HTTP 200, and index.html/version.json agreed. The
 * failure was a dropped request on the device, but the app reported it as a new
 * deploy and looped.
 */

const chunkError = () =>
  Object.assign(new TypeError('Importing a module script failed.'), {
    name: 'TypeError',
  });

// React.lazy keeps the factory on the payload until first render, so it can be
// driven directly without mounting a tree.
const driveFactory = (Lazy: unknown) =>
  (
    Lazy as { _payload: { _result: () => Promise<unknown> } }
  )._payload._result();

describe('isChunkLoadError — one predicate, shared by retry and reporting', () => {
  // These two lists used to live in separate files and disagreed. A bare
  // `TypeError: Failed to fetch` was claimed by ChunkErrorBoundary (so the user
  // was told a new version existed) but was absent from lazyWithRetry's list
  // (so it was never retried). That asymmetry is what this locks shut.
  const chunkFailures: Array<[string, { name: string; message: string }]> = [
    [
      'Safari module import',
      { name: 'TypeError', message: 'Importing a module script failed.' },
    ],
    [
      'Chrome/Vite dynamic import',
      {
        name: 'TypeError',
        message: 'Failed to fetch dynamically imported module: /assets/X.js',
      },
    ],
    ['bare network failure', { name: 'TypeError', message: 'Failed to fetch' }],
    [
      'webpack-era chunk',
      { name: 'ChunkLoadError', message: 'Loading chunk 42 failed' },
    ],
    ['css chunk', { name: 'Error', message: 'Loading CSS chunk 7 failed' }],
  ];

  for (const [label, err] of chunkFailures) {
    it(`treats ${label} as a chunk load error`, () => {
      expect(isChunkLoadError(err)).toBe(true);
    });
  }

  it('does not claim ordinary application errors', () => {
    expect(
      isChunkLoadError(
        new TypeError("Cannot read properties of undefined (reading 'map')"),
      ),
    ).toBe(false);
    expect(isChunkLoadError(new Error('Request failed with status 500'))).toBe(
      false,
    );
  });

  it('survives non-Error values without throwing', () => {
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
    expect(isChunkLoadError('Importing a module script failed.')).toBe(false);
  });
});

describe('lazyWithRetry — fails fast instead of replaying a cached rejection', () => {
  it('calls the import exactly twice: one attempt plus one retry', async () => {
    // A failed module fetch is recorded in the page's module map, so calling the
    // SAME import() again returns the stored rejection with no network request.
    // Extra retries cannot recover; they only delay the reload that can. The old
    // code called this 3 times (1 + 2 retries) behind 3s of backoff, which is
    // what the user sat through before seeing the wrong error message.
    const importFn = vi.fn().mockRejectedValue(chunkError());

    const Lazy = lazyWithRetry(importFn as never, 'Doomed');
    await expect(driveFactory(Lazy)).rejects.toThrow(
      /Importing a module script failed/,
    );

    expect(importFn).toHaveBeenCalledTimes(2);
  });

  it('recovers if the retry succeeds', async () => {
    const component = { default: () => null };
    const importFn = vi
      .fn()
      .mockRejectedValueOnce(chunkError())
      .mockResolvedValueOnce(component);

    const Lazy = lazyWithRetry(importFn as never, 'Flaky');
    await expect(driveFactory(Lazy)).resolves.toBe(component);
    expect(importFn).toHaveBeenCalledTimes(2);
  });

  it('does not retry errors that are not chunk failures', async () => {
    const importFn = vi
      .fn()
      .mockRejectedValue(new TypeError('x is not a function'));

    const Lazy = lazyWithRetry(importFn as never, 'Broken');
    await expect(driveFactory(Lazy)).rejects.toThrow(/not a function/);
    expect(importFn).toHaveBeenCalledTimes(1);
  });
});
