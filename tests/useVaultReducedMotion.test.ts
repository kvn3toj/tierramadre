import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useVaultReducedMotion } from '../src/hooks/useVaultReducedMotion';

type MqlListener = (e: MediaQueryListEvent) => void;

interface MockMediaQueryList {
  matches: boolean;
  media: string;
  addEventListener: (type: 'change', l: MqlListener) => void;
  removeEventListener: (type: 'change', l: MqlListener) => void;
  dispatchChange: (matches: boolean) => void;
}

function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<MqlListener>();
  const mql: MockMediaQueryList = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_, l) => listeners.add(l),
    removeEventListener: (_, l) => listeners.delete(l),
    dispatchChange(matches) {
      mql.matches = matches;
      listeners.forEach((l) =>
        l({ matches, media: mql.media } as MediaQueryListEvent),
      );
    },
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => mql),
  );
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => mql),
  });
  return mql;
}

describe('useVaultReducedMotion', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns false when system has no reduced-motion preference', () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useVaultReducedMotion());
    expect(result.current.reducedMotion).toBe(false);
    expect(result.current.idleAnimationsAllowed).toBe(true);
  });

  it('returns true when system requests reduced motion', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useVaultReducedMotion());
    expect(result.current.reducedMotion).toBe(true);
    expect(result.current.idleAnimationsAllowed).toBe(false);
  });

  it('reacts to changes in the media query', () => {
    const mql = installMatchMedia(false);
    const { result } = renderHook(() => useVaultReducedMotion());
    expect(result.current.reducedMotion).toBe(false);
    act(() => mql.dispatchChange(true));
    expect(result.current.reducedMotion).toBe(true);
  });

  it('disables idle animations when document is hidden', () => {
    installMatchMedia(false);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    const { result } = renderHook(() => useVaultReducedMotion());
    expect(result.current.idleAnimationsAllowed).toBe(false);
  });
});
