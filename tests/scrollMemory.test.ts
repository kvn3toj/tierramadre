/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveScrollPos,
  readScrollPos,
  saveLoadedPages,
  readLoadedPages,
  restoreScrollWhenReady,
} from '../src/utils/scrollMemory';

describe('scrollMemory storage', () => {
  beforeEach(() => sessionStorage.clear());

  it('round-trips a scroll offset', () => {
    expect(readScrollPos('treasure')).toBeNull();
    saveScrollPos('treasure', 1234);
    expect(readScrollPos('treasure')).toBe(1234);
  });

  it('rounds fractional offsets', () => {
    saveScrollPos('treasure', 100.7);
    expect(readScrollPos('treasure')).toBe(101);
  });

  it('clears the entry when saving zero or a negative offset', () => {
    saveScrollPos('treasure', 500);
    saveScrollPos('treasure', 0);
    expect(readScrollPos('treasure')).toBeNull();
  });

  it('keeps scroll and pages entries in separate namespaces', () => {
    saveScrollPos('k', 300);
    saveLoadedPages('k', 4);
    expect(readScrollPos('k')).toBe(300);
    expect(readLoadedPages('k')).toBe(4);
  });
});

describe('restoreScrollWhenReady', () => {
  beforeEach(() => {
    // Run rAF callbacks synchronously so the retry loop is deterministic.
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(
      (cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      },
    );
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('restores the offset once content is tall enough', () => {
    const el = { scrollTop: 0, scrollHeight: 5000, clientHeight: 800 } as HTMLElement;
    restoreScrollWhenReady(() => el, 1200);
    expect(el.scrollTop).toBe(1200);
  });

  it('clamps to the max scrollable distance when content is shorter', () => {
    const el = { scrollTop: 0, scrollHeight: 1000, clientHeight: 800 } as HTMLElement;
    restoreScrollWhenReady(() => el, 5000); // max scroll = 200
    expect(el.scrollTop).toBe(200);
  });

  it('is a no-op for non-positive targets', () => {
    const el = { scrollTop: 0, scrollHeight: 5000, clientHeight: 800 } as HTMLElement;
    restoreScrollWhenReady(() => el, 0);
    expect(el.scrollTop).toBe(0);
  });
});
