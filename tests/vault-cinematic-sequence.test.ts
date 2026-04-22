import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVaultCinematicSequence } from '../src/components/vault/cinematic/useVaultCinematicSequence';

describe('useVaultCinematicSequence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at idle when state is idle', () => {
    const { result } = renderHook(() =>
      useVaultCinematicSequence({ state: 'idle', reducedMotion: false, onSequenceComplete: vi.fn() }),
    );
    expect(result.current.phase).toBe('idle');
  });

  it('transitions through anticipate → confirm → release → swing → reveal → dolly on unlocking', () => {
    const onComplete = vi.fn();
    const { result, rerender } = renderHook(
      (props: { state: 'idle' | 'unlocking' }) =>
        useVaultCinematicSequence({
          state: props.state,
          reducedMotion: false,
          onSequenceComplete: onComplete,
        }),
      { initialProps: { state: 'idle' } },
    );

    rerender({ state: 'unlocking' });
    expect(result.current.phase).toBe('anticipate');

    act(() => vi.advanceTimersByTime(80));
    expect(result.current.phase).toBe('confirm');

    act(() => vi.advanceTimersByTime(320));
    expect(result.current.phase).toBe('release');

    act(() => vi.advanceTimersByTime(500));
    expect(result.current.phase).toBe('swing');

    act(() => vi.advanceTimersByTime(690));
    expect(result.current.phase).toBe('reveal');

    act(() => vi.advanceTimersByTime(400));
    expect(result.current.phase).toBe('dolly');

    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(110));
    expect(onComplete).toHaveBeenCalledTimes(1); // dispatched at 2200 ms (offset)
  });

  it('reaches reveal in 700 ms when reducedMotion is true', () => {
    const onComplete = vi.fn();
    const { result, rerender } = renderHook(
      (props: { state: 'idle' | 'unlocking' }) =>
        useVaultCinematicSequence({
          state: props.state,
          reducedMotion: true,
          onSequenceComplete: onComplete,
        }),
      { initialProps: { state: 'idle' } },
    );
    rerender({ state: 'unlocking' });
    // Reduced-motion skips anticipate; jumps directly to confirm
    expect(result.current.phase).toBe('confirm');
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.phase).toBe('release');
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.phase).toBe('swing');
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.phase).toBe('reveal');
    act(() => vi.advanceTimersByTime(200));
    expect(onComplete).toHaveBeenCalled();
  });

  it('enters failure phase on error state', () => {
    const { result, rerender } = renderHook(
      (props: { state: 'idle' | 'error' }) =>
        useVaultCinematicSequence({
          state: props.state,
          reducedMotion: false,
          onSequenceComplete: vi.fn(),
        }),
      { initialProps: { state: 'idle' } },
    );
    rerender({ state: 'error' });
    expect(result.current.phase).toBe('failure');
  });
});
