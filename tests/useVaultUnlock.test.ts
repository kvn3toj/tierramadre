import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVaultUnlock } from '../src/hooks/useVaultUnlock';
import { VAULT_STORAGE, VAULT_UNIVERSAL, VAULT_SYMBOLS, VAULT_CONFIG } from '../src/config/vault';
import type { VaultCombination } from '../src/types/vault';

const UNIVERSAL_OUTER_INDEX = VAULT_SYMBOLS.findIndex((s) => s.id === VAULT_UNIVERSAL.outer);

describe('useVaultUnlock', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at idle with 3 attempts and outer/inner = 0', () => {
    const { result } = renderHook(() => useVaultUnlock());
    expect(result.current.state).toBe('idle');
    expect(result.current.attemptsLeft).toBe(VAULT_CONFIG.MAX_ATTEMPTS);
    expect(result.current.cooldownSecondsLeft).toBe(0);
    expect(result.current.outerIdx).toBe(0);
    expect(result.current.innerIdx).toBe(0);
  });

  it('tryUnlock with universal match transitions to unlocking and persists', () => {
    const { result } = renderHook(() => useVaultUnlock());
    act(() => {
      result.current.setOuterIdx(UNIVERSAL_OUTER_INDEX);
      result.current.setInnerIdx(VAULT_UNIVERSAL.inner);
    });
    act(() => {
      result.current.tryUnlock();
    });
    expect(result.current.state).toBe('unlocking');
    expect(localStorage.getItem(VAULT_STORAGE.UNLOCKED)).toBe('true');
    expect(localStorage.getItem(VAULT_STORAGE.UNLOCK_METHOD)).toBe('universal');
  });

  it('tryUnlock with ambassador override match records slug', () => {
    const ambassadorCodes = new Map<string, VaultCombination>([
      ['paola-daza', { outer: 'corazon_verde', inner: 3 }],
    ]);
    const { result } = renderHook(() => useVaultUnlock({ ambassadorCodes }));

    const outerIdx = VAULT_SYMBOLS.findIndex((s) => s.id === 'corazon_verde');
    act(() => {
      result.current.setOuterIdx(outerIdx);
      result.current.setInnerIdx(3);
    });
    act(() => {
      result.current.tryUnlock();
    });

    expect(result.current.state).toBe('unlocking');
    expect(localStorage.getItem(VAULT_STORAGE.UNLOCK_METHOD)).toBe('ambassador:paola-daza');
  });

  it('tryUnlock with no match increments attempts and sets error', () => {
    const { result } = renderHook(() => useVaultUnlock());
    act(() => {
      result.current.setOuterIdx(1);
      result.current.setInnerIdx(0);
    });
    act(() => {
      result.current.tryUnlock();
    });
    expect(result.current.state).toBe('error');
    expect(result.current.attemptsLeft).toBe(2);
  });

  it('3 consecutive fails enter cooldown', () => {
    const { result } = renderHook(() => useVaultUnlock());

    const miss = () => {
      act(() => {
        result.current.setOuterIdx(1);
        result.current.setInnerIdx(0);
      });
      act(() => {
        result.current.tryUnlock();
      });
      act(() => {
        vi.advanceTimersByTime(450);
      });
    };

    miss();
    miss();
    miss();

    expect(result.current.state).toBe('cooldown');
    expect(result.current.attemptsLeft).toBe(0);
    expect(result.current.cooldownSecondsLeft).toBeGreaterThan(0);
    expect(localStorage.getItem(VAULT_STORAGE.COOLDOWN_UNTIL)).not.toBeNull();
  });

  it('tryUnlock during cooldown is a no-op', () => {
    const { result } = renderHook(() => useVaultUnlock());

    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.setOuterIdx(1);
        result.current.setInnerIdx(0);
      });
      act(() => {
        result.current.tryUnlock();
      });
      act(() => {
        vi.advanceTimersByTime(450);
      });
    }
    expect(result.current.state).toBe('cooldown');

    act(() => {
      result.current.setOuterIdx(UNIVERSAL_OUTER_INDEX);
      result.current.setInnerIdx(VAULT_UNIVERSAL.inner);
    });
    act(() => {
      result.current.tryUnlock();
    });

    expect(result.current.state).toBe('cooldown');
    expect(localStorage.getItem(VAULT_STORAGE.UNLOCKED)).not.toBe('true');
  });

  it('cooldown expires and resets attempts', () => {
    const { result } = renderHook(() => useVaultUnlock());

    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.setOuterIdx(1);
        result.current.setInnerIdx(0);
      });
      act(() => {
        result.current.tryUnlock();
      });
      act(() => {
        vi.advanceTimersByTime(450);
      });
    }
    expect(result.current.state).toBe('cooldown');

    act(() => {
      vi.advanceTimersByTime(VAULT_CONFIG.COOLDOWN_MS + 1000);
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.attemptsLeft).toBe(VAULT_CONFIG.MAX_ATTEMPTS);
    expect(localStorage.getItem(VAULT_STORAGE.COOLDOWN_UNTIL)).toBeNull();
  });

  it('rehydrates cooldown from localStorage on mount', () => {
    const future = Date.now() + 60_000;
    localStorage.setItem(VAULT_STORAGE.COOLDOWN_UNTIL, String(future));
    localStorage.setItem(VAULT_STORAGE.ATTEMPTS, '3');

    const { result } = renderHook(() => useVaultUnlock());
    expect(result.current.state).toBe('cooldown');
    expect(result.current.cooldownSecondsLeft).toBeGreaterThan(55);
    expect(result.current.cooldownSecondsLeft).toBeLessThanOrEqual(60);
  });

  it('expired cooldown in localStorage clears on mount', () => {
    const past = Date.now() - 1000;
    localStorage.setItem(VAULT_STORAGE.COOLDOWN_UNTIL, String(past));
    localStorage.setItem(VAULT_STORAGE.ATTEMPTS, '3');

    const { result } = renderHook(() => useVaultUnlock());
    expect(result.current.state).toBe('idle');
    expect(result.current.attemptsLeft).toBe(VAULT_CONFIG.MAX_ATTEMPTS);
    expect(localStorage.getItem(VAULT_STORAGE.COOLDOWN_UNTIL)).toBeNull();
  });

  it('survives localStorage throwing (private mode)', () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useVaultUnlock());
    expect(() => {
      act(() => {
        result.current.setOuterIdx(UNIVERSAL_OUTER_INDEX);
        result.current.setInnerIdx(VAULT_UNIVERSAL.inner);
      });
      act(() => {
        result.current.tryUnlock();
      });
    }).not.toThrow();

    expect(result.current.state).toBe('unlocking');

    Storage.prototype.setItem = originalSetItem;
  });
});
