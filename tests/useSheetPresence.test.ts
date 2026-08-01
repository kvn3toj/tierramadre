/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSheetPresence } from '../src/hooks/useSheetPresence';

/**
 * Regression guard for the catalog "tap Filtros and the screen goes black" bug.
 *
 * IOSMoreSheet / IOSSettingsSheet are `position: fixed` and used to hide with
 * `transform: translateY(100%)` + `visibility: hidden` only. Neither removes a
 * box from layout, so a *closed* sheet sat a full sheet-height below the fold
 * and made the document scrollable by ~804px — in an app shell whose whole
 * design (IOSLayout: `height: 100dvh; overflow: hidden`) assumes it never
 * scrolls. Once it scrolled, every fixed element including the shell painted
 * off-screen.
 *
 * `mounted` is what keeps a closed sheet out of layout; `entered` is what keeps
 * the slide-in animation working despite that. Both halves matter.
 */
describe('useSheetPresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom has no rAF timing; drive it off the fake clock.
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(0), 16) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) =>
      clearTimeout(id as unknown as NodeJS.Timeout),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts closed: not mounted, so a closed sheet holds no box in layout', () => {
    const { result } = renderHook(() => useSheetPresence(false));
    expect(result.current.mounted).toBe(false);
    expect(result.current.entered).toBe(false);
  });

  it('starts open without an entrance dance when it mounts already open', () => {
    const { result } = renderHook(() => useSheetPresence(true));
    expect(result.current.mounted).toBe(true);
    expect(result.current.entered).toBe(true);
  });

  it('on open, mounts BEFORE it enters so the slide-in has a starting style', () => {
    const { result, rerender } = renderHook(
      ({ open }) => useSheetPresence(open),
      { initialProps: { open: false } },
    );

    rerender({ open: true });
    // The box exists, but still at translateY(100%) — this is the frame the
    // browser needs in order to have something to animate from.
    expect(result.current.mounted).toBe(true);
    expect(result.current.entered).toBe(false);

    act(() => {
      vi.advanceTimersByTime(32);
    });
    expect(result.current.entered).toBe(true);
  });

  it('on close, stays mounted through the exit transition, then leaves layout', () => {
    const { result, rerender } = renderHook(
      ({ open }) => useSheetPresence(open, 450),
      { initialProps: { open: true } },
    );

    rerender({ open: false });
    // Sliding out: still in layout so the transition is visible.
    expect(result.current.entered).toBe(false);
    expect(result.current.mounted).toBe(true);

    act(() => {
      vi.advanceTimersByTime(449);
    });
    expect(result.current.mounted).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2);
    });
    // Exit finished — the box is gone, and with it the document overflow that
    // pushed the whole fixed shell off-screen.
    expect(result.current.mounted).toBe(false);
  });

  it('reopening mid-exit cancels the unmount instead of dropping the sheet', () => {
    const { result, rerender } = renderHook(
      ({ open }) => useSheetPresence(open, 450),
      { initialProps: { open: true } },
    );

    rerender({ open: false });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ open: true });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.mounted).toBe(true);
    expect(result.current.entered).toBe(true);
  });
});
