import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAbonoSequence } from "../src/components/esmereogenesis/AbonoCinematic/useAbonoSequence";

/**
 * Covers the two behaviours most likely to break the aporte cinematic:
 *  - the `holdAtEclosion` branch (a completion must stop on the ceremony and
 *    never auto-fire onComplete), and
 *  - the notify effect's one-fire-per-transition guard. Consumers pass an
 *    inline onPhaseChange that changes identity every render; without the guard
 *    the effect re-fires the callback on every re-render, which (in
 *    AbonoCinematic) re-enters the 60fps count-up ramp and stacks rAF loops.
 */
describe("useAbonoSequence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("holds on the eclosión ceremony and never auto-completes", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useAbonoSequence({
        active: true,
        reducedMotion: false,
        isCompletion: true,
        holdAtEclosion: true,
        onComplete,
      }),
    );
    act(() => vi.advanceTimersByTime(20000));
    expect(result.current.phase).toBe("eclosion");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("skip() jumps straight to the held eclosión, not release, without completing", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useAbonoSequence({
        active: true,
        reducedMotion: false,
        isCompletion: true,
        holdAtEclosion: true,
        onComplete,
      }),
    );
    act(() => result.current.skip());
    expect(result.current.phase).toBe("eclosion");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("a non-completion runs to release and fires onComplete exactly once", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useAbonoSequence({
        active: true,
        reducedMotion: false,
        isCompletion: false,
        onComplete,
      }),
    );
    act(() => vi.advanceTimersByTime(8000));
    expect(result.current.phase).toBe("release");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("fires onPhaseChange once per phase even when the callback identity changes every render", () => {
    const spy = vi.fn();
    const onComplete = vi.fn();
    const { rerender } = renderHook(() =>
      useAbonoSequence({
        active: true,
        reducedMotion: false,
        isCompletion: false,
        onComplete,
        // New arrow each render → would re-fire on every render without the guard.
        onPhaseChange: (p) => spy(p),
      }),
    );

    // Mount lands on "anticipate". Force extra re-renders while the phase is
    // unchanged; the guard must keep it to a single call for that phase.
    act(() => {
      rerender();
      rerender();
      rerender();
    });
    expect(spy.mock.calls.filter(([p]) => p === "anticipate")).toHaveLength(1);

    // Advance one phase; the new phase fires exactly once across more re-renders.
    act(() => vi.advanceTimersByTime(500));
    act(() => {
      rerender();
      rerender();
    });
    expect(spy.mock.calls.filter(([p]) => p === "droplet")).toHaveLength(1);
  });
});
