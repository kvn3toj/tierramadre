import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVaultUnlock } from '../src/hooks/useVaultUnlock';
import {
  VAULT_STORAGE,
  VAULT_UNIVERSAL,
  VAULT_SYMBOLS,
  VAULT_CONFIG,
} from '../src/config/vault';

const UNIVERSAL_OUTER_INDEX = VAULT_SYMBOLS.findIndex(
  (s) => s.id === VAULT_UNIVERSAL.outer,
);

/**
 * N5 (2026-08 fix round 3): ambassador-specific combinations are no longer
 * checked against a client-side Map — useVaultUnlock POSTs the candidate to
 * /api/vault-unlock and awaits a match boolean. Every non-universal
 * `tryUnlock()` in these tests is therefore async now; `fetch` is mocked
 * per test, and `vi.advanceTimersByTimeAsync` (not the sync
 * `advanceTimersByTime`) is used throughout so the mocked fetch's promise
 * gets a turn to resolve alongside the existing fake-timer-driven shake/
 * cooldown transitions.
 */
function mockVaultUnlockFetch(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  } as Response);
}

describe('useVaultUnlock', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.stubGlobal('fetch', mockVaultUnlockFetch({ matched: false }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts at idle with 3 attempts and outer/inner = 0', () => {
    const { result } = renderHook(() => useVaultUnlock());
    expect(result.current.state).toBe('idle');
    expect(result.current.attemptsLeft).toBe(VAULT_CONFIG.MAX_ATTEMPTS);
    expect(result.current.cooldownSecondsLeft).toBe(0);
    expect(result.current.outerIdx).toBe(0);
    expect(result.current.innerIdx).toBe(0);
  });

  it('tryUnlock with universal match transitions to unlocking and persists (no server call — checked client-side)', () => {
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
    expect(fetch).not.toHaveBeenCalled();
  });

  it('tryUnlock with an ambassador-matching combination asks the server and records the returned slug', async () => {
    vi.stubGlobal(
      'fetch',
      mockVaultUnlockFetch({ matched: true, slug: 'paola-daza' }),
    );

    const { result } = renderHook(() => useVaultUnlock());
    const outerIdx = VAULT_SYMBOLS.findIndex((s) => s.id === 'corazon_verde');
    act(() => {
      result.current.setOuterIdx(outerIdx);
      result.current.setInnerIdx(3);
    });
    act(() => {
      result.current.tryUnlock();
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/vault-unlock',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ outer: 'corazon_verde', inner: 3 }),
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.state).toBe('unlocking');
    expect(localStorage.getItem(VAULT_STORAGE.UNLOCK_METHOD)).toBe(
      'ambassador:paola-daza',
    );
  });

  it('tryUnlock with no match asks the server, gets matched: false, and sets error', async () => {
    const { result } = renderHook(() => useVaultUnlock());
    act(() => {
      result.current.setOuterIdx(1);
      result.current.setInnerIdx(0);
    });
    act(() => {
      result.current.tryUnlock();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.state).toBe('error');
    expect(result.current.attemptsLeft).toBe(2);
  });

  it('a network failure is treated like a mismatch — never leaves the dial stuck', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );
    const { result } = renderHook(() => useVaultUnlock());
    act(() => {
      result.current.setOuterIdx(1);
      result.current.setInnerIdx(0);
    });
    act(() => {
      result.current.tryUnlock();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.state).toBe('error');
    expect(result.current.attemptsLeft).toBe(2);
  });

  it('a second tryUnlock() call while the server check is in flight is a no-op (no double-submit)', async () => {
    let resolveFetch!: (value: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );
    const { result } = renderHook(() => useVaultUnlock());
    act(() => {
      result.current.setOuterIdx(1);
      result.current.setInnerIdx(0);
    });
    act(() => {
      result.current.tryUnlock();
      result.current.tryUnlock();
      result.current.tryUnlock();
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({ matched: false }),
      } as Response);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.state).toBe('error');
  });

  it('3 consecutive fails enter cooldown', async () => {
    const { result } = renderHook(() => useVaultUnlock());

    const miss = async () => {
      act(() => {
        result.current.setOuterIdx(1);
        result.current.setInnerIdx(0);
      });
      act(() => {
        result.current.tryUnlock();
      });
      // Let the mocked fetch's promise chain resolve first (registerWrongAttempt
      // runs and schedules the 400ms shake timeout) before advancing fake time —
      // advanceTimersByTimeAsync alone does not reliably yield to unrelated
      // microtasks when no fake timer is pending yet.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(450);
      });
    };

    await miss();
    await miss();
    await miss();

    expect(result.current.state).toBe('cooldown');
    expect(result.current.attemptsLeft).toBe(0);
    expect(result.current.cooldownSecondsLeft).toBeGreaterThan(0);
    expect(localStorage.getItem(VAULT_STORAGE.COOLDOWN_UNTIL)).not.toBeNull();
  });

  it('tryUnlock during cooldown is a no-op', async () => {
    const { result } = renderHook(() => useVaultUnlock());

    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.setOuterIdx(1);
        result.current.setInnerIdx(0);
      });
      act(() => {
        result.current.tryUnlock();
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(450);
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

  it('cooldown expires and resets attempts', async () => {
    const { result } = renderHook(() => useVaultUnlock());

    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.setOuterIdx(1);
        result.current.setInnerIdx(0);
      });
      act(() => {
        result.current.tryUnlock();
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(450);
      });
    }
    expect(result.current.state).toBe('cooldown');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(VAULT_CONFIG.COOLDOWN_MS + 1000);
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

  it('survives localStorage throwing (private mode) — universal path, no server call', () => {
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
