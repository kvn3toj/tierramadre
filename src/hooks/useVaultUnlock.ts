import { useCallback, useEffect, useRef, useState } from 'react';
import {
  VAULT_CONFIG,
  VAULT_STORAGE,
  VAULT_SYMBOLS,
  VAULT_UNIVERSAL,
} from '../config/vault';
import type { VaultCombination, VaultState } from '../types/vault';

export interface UseVaultUnlockReturn {
  outerIdx: number;
  innerIdx: number;
  setOuterIdx: (i: number) => void;
  setInnerIdx: (i: number) => void;

  state: VaultState;
  attemptsLeft: number;
  cooldownSecondsLeft: number;

  tryUnlock: () => void;
  reset: () => void;
}

/** Safe localStorage wrappers — Safari private mode may throw. */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* no-op */
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* no-op */
  }
}

/** Initial state — synchronous read from localStorage (anti-blinking). */
function readInitialState(): {
  state: VaultState;
  attemptsLeft: number;
  cooldownUntil: number | null;
} {
  const cooldownRaw = safeGetItem(VAULT_STORAGE.COOLDOWN_UNTIL);
  const attemptsRaw = safeGetItem(VAULT_STORAGE.ATTEMPTS);

  const cooldownUntilParsed = cooldownRaw
    ? Number.parseInt(cooldownRaw, 10)
    : null;
  const cooldownUntil = Number.isFinite(cooldownUntilParsed)
    ? cooldownUntilParsed
    : null;
  const attemptsUsed = attemptsRaw ? Number.parseInt(attemptsRaw, 10) || 0 : 0;
  const attemptsLeft = Math.max(0, VAULT_CONFIG.MAX_ATTEMPTS - attemptsUsed);

  if (cooldownUntil && cooldownUntil > Date.now()) {
    return { state: 'cooldown', attemptsLeft: 0, cooldownUntil };
  }

  if (cooldownUntil) {
    safeRemoveItem(VAULT_STORAGE.COOLDOWN_UNTIL);
    safeRemoveItem(VAULT_STORAGE.ATTEMPTS);
    return {
      state: 'idle',
      attemptsLeft: VAULT_CONFIG.MAX_ATTEMPTS,
      cooldownUntil: null,
    };
  }

  return { state: 'idle', attemptsLeft, cooldownUntil: null };
}

export function useVaultUnlock(): UseVaultUnlockReturn {
  const [outerIdx, setOuterIdx] = useState(0);
  const [innerIdx, setInnerIdx] = useState(0);

  const initial = useRef(readInitialState());
  const [state, setState] = useState<VaultState>(initial.current.state);
  const [attemptsLeft, setAttemptsLeft] = useState(
    initial.current.attemptsLeft,
  );
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(
    initial.current.cooldownUntil,
  );
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(
    initial.current.cooldownUntil
      ? Math.max(
          0,
          Math.ceil((initial.current.cooldownUntil - Date.now()) / 1000),
        )
      : 0,
  );

  const shakeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state !== 'cooldown' || !cooldownUntil) {
      if (cooldownInterval.current) {
        clearInterval(cooldownInterval.current);
        cooldownInterval.current = null;
      }
      return;
    }

    const tick = () => {
      const left = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSecondsLeft(left);
      if (left === 0) {
        safeRemoveItem(VAULT_STORAGE.COOLDOWN_UNTIL);
        safeRemoveItem(VAULT_STORAGE.ATTEMPTS);
        setCooldownUntil(null);
        setAttemptsLeft(VAULT_CONFIG.MAX_ATTEMPTS);
        setState('idle');
      }
    };

    tick();
    cooldownInterval.current = setInterval(tick, 1000);

    return () => {
      if (cooldownInterval.current) {
        clearInterval(cooldownInterval.current);
        cooldownInterval.current = null;
      }
    };
  }, [state, cooldownUntil]);

  useEffect(() => {
    return () => {
      if (shakeTimeout.current) {
        clearTimeout(shakeTimeout.current);
      }
    };
  }, []);

  // Guards against a double-submit while the server check (below) is in
  // flight — tryUnlock's own `state === 'error'` early-return only kicks in
  // AFTER the 400ms shake timeout fires, which is well after a fetch could
  // still be pending.
  const checkInFlight = useRef(false);

  const registerWrongAttempt = useCallback(() => {
    setAttemptsLeft((prev) => {
      const remaining = Math.max(0, prev - 1);
      const usedNow = VAULT_CONFIG.MAX_ATTEMPTS - remaining;
      safeSetItem(VAULT_STORAGE.ATTEMPTS, String(usedNow));

      if (remaining === 0) {
        const until = Date.now() + VAULT_CONFIG.COOLDOWN_MS;
        safeSetItem(VAULT_STORAGE.COOLDOWN_UNTIL, String(until));
        setCooldownUntil(until);
        setCooldownSecondsLeft(Math.ceil(VAULT_CONFIG.COOLDOWN_MS / 1000));
        if (shakeTimeout.current) clearTimeout(shakeTimeout.current);
        shakeTimeout.current = setTimeout(() => {
          setState('cooldown');
        }, 400);
      } else {
        if (shakeTimeout.current) clearTimeout(shakeTimeout.current);
        shakeTimeout.current = setTimeout(() => {
          setState('idle');
        }, 400);
      }
      return remaining;
    });
    setState('error');
  }, []);

  const tryUnlock = useCallback(() => {
    if (
      state === 'unlocking' ||
      state === 'cooldown' ||
      state === 'error' ||
      checkInFlight.current
    )
      return;

    const outerId = VAULT_SYMBOLS[outerIdx]?.id;
    if (!outerId) return;
    const candidate: VaultCombination = { outer: outerId, inner: innerIdx };

    if (
      candidate.outer === VAULT_UNIVERSAL.outer &&
      candidate.inner === VAULT_UNIVERSAL.inner
    ) {
      safeSetItem(VAULT_STORAGE.UNLOCKED, 'true');
      safeSetItem(VAULT_STORAGE.UNLOCK_METHOD, 'universal');
      safeRemoveItem(VAULT_STORAGE.ATTEMPTS);
      safeRemoveItem(VAULT_STORAGE.COOLDOWN_UNTIL);
      setState('unlocking');
      return;
    }

    // Ambassador-specific codes are verified server-side (N5, 2026-08 fix
    // round 3) — the client no longer holds the code list, so it cannot
    // check candidate combinations locally. api/vault-unlock.ts returns
    // only a match boolean (+ the matching asesor's already-public slug),
    // never the code list itself.
    checkInFlight.current = true;
    (async () => {
      try {
        const response = await fetch('/api/vault-unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(candidate),
        });
        const data = response.ok
          ? ((await response.json().catch(() => null)) as {
              matched?: boolean;
              slug?: string;
            } | null)
          : null;

        if (data?.matched) {
          safeSetItem(VAULT_STORAGE.UNLOCKED, 'true');
          safeSetItem(
            VAULT_STORAGE.UNLOCK_METHOD,
            `ambassador:${data.slug ?? ''}`,
          );
          safeRemoveItem(VAULT_STORAGE.ATTEMPTS);
          safeRemoveItem(VAULT_STORAGE.COOLDOWN_UNTIL);
          setState('unlocking');
          return;
        }
      } catch {
        // Network failure — fall through and treat like any other
        // mismatch. Never leaves the dial stuck waiting.
      } finally {
        checkInFlight.current = false;
      }
      registerWrongAttempt();
    })();
  }, [state, outerIdx, innerIdx, registerWrongAttempt]);

  const reset = useCallback(() => {
    if (shakeTimeout.current) {
      clearTimeout(shakeTimeout.current);
      shakeTimeout.current = null;
    }
    safeRemoveItem(VAULT_STORAGE.UNLOCKED);
    safeRemoveItem(VAULT_STORAGE.UNLOCK_METHOD);
    safeRemoveItem(VAULT_STORAGE.ATTEMPTS);
    safeRemoveItem(VAULT_STORAGE.COOLDOWN_UNTIL);
    setState('idle');
    setAttemptsLeft(VAULT_CONFIG.MAX_ATTEMPTS);
    setCooldownUntil(null);
    setCooldownSecondsLeft(0);
  }, []);

  return {
    outerIdx,
    innerIdx,
    setOuterIdx,
    setInnerIdx,
    state,
    attemptsLeft,
    cooldownSecondsLeft,
    tryUnlock,
    reset,
  };
}
