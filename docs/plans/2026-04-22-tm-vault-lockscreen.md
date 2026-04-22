# T9.1 Bóveda Secreta — Lockscreen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el gate de acceso a la Bóveda Secreta — dos anillos concéntricos arrastrables (12 símbolos TM + dígitos 0-9), cooldown tras 3 fallos, combinación universal + overrides por embajador. Porta el patrón del `LockScreen.tsx` de cholqi al stack MUI v6 de Tierra Mädre.

**Architecture:** Enfoque de **descomposición en componentes pequeños** (spec §3). Hook `useVaultUnlock` concentra la lógica (validación, attempts, cooldown, persistencia en localStorage). Componentes UI presentacionales: `VaultDial` (anillo genérico drag+snap), `VaultDialLabel` (label contrarrotante), `VaultSymbol` (12 SVGs inline), `VaultCenter` (hub con estado visual), `VaultLockScreen` (orquestador/shell). `VaultPage.tsx` actual solo se envuelve con el gate sin tocar su contenido.

**Tech Stack:** React 18.3 + TypeScript 5.6 + MUI v6 (`sx` + `@mui/material/styles`) + Framer Motion 12 (`useMotionValue`, `useSpring`, `useTransform`, `useReducedMotion`) + Vitest 2.1.9 + tokens canónicos desde `@/design-system`.

**Testing strategy:** Tests unitarios (Vitest) de la lógica pura (hook `useVaultUnlock`, util `parseVaultCode`). Componentes UI se validan por **QA manual en browser** — convención actual del repo que no tiene `@testing-library/react`. Los criterios de aceptación del spec §13 se verifican con device matrix manual.

**Referencia origen:** `/Users/kevinp/Movies/coomunity-universe/cholqi/src/components/LockScreen.tsx` (454 líneas). Portamos la lógica de drag + snap + spring; re-escribimos estilos de Tailwind a `sx` de MUI.

---

## Task 0: Preparación — branch y rama de trabajo

**Files:** ninguno (solo git)

- [ ] **Step 0.1: Crear branch desde main**

```bash
cd /Users/kevinp/Movies/coomunity-universe/TierraMadre
git checkout main
git pull --rebase
git checkout -b feat/t9-vault-lockscreen
```

- [ ] **Step 0.2: Verificar que no hay cambios pendientes**

```bash
git status --short
```
Expected: vacío (o solo los archivos no relacionados listados en el initial git status — no son nuestros).

---

## Task 1: Tipos y configuración estática

**Files:**
- Create: `src/types/vault.ts`
- Create: `src/config/vault.ts`

Esta tarea es pura data/tipos. No tiene tests unitarios (ya los cubrirán los consumers).

- [ ] **Step 1.1: Crear `src/types/vault.ts`**

```ts
export type VaultSymbolId =
  | 'esmeralda'
  | 'sol'
  | 'luna'
  | 'montana'
  | 'rio'
  | 'arbol'
  | 'ojo'
  | 'estrella'
  | 'condor'
  | 'jaguar'
  | 'espiral'
  | 'corazon_verde';

export interface VaultSymbolMeta {
  id: VaultSymbolId;
  name: string;
  color: string;
}

export interface VaultCombination {
  outer: VaultSymbolId;
  inner: number; // 0..9
}

export type VaultState = 'idle' | 'unlocking' | 'error' | 'cooldown';

export type UnlockMethod =
  | { method: 'universal' }
  | { method: 'ambassador'; ambassadorSlug: string };
```

- [ ] **Step 1.2: Crear `src/config/vault.ts`**

```ts
import { emeraldCore, goldAccent } from '../design-system';
import type { VaultCombination, VaultSymbolMeta } from '../types/vault';

export const VAULT_STORAGE = {
  UNLOCKED: 'tm:vault:unlocked',
  ATTEMPTS: 'tm:vault:attempts',
  COOLDOWN_UNTIL: 'tm:vault:cooldown',
  UNLOCK_METHOD: 'tm:vault:method',
} as const;

export const VAULT_CONFIG = {
  MAX_ATTEMPTS: 3,
  COOLDOWN_MS: 5 * 60 * 1000, // 5 minutos
  UNLOCK_ANIMATION_MS: 900, // duración del glow
  FADE_OUT_MS: 600, // fade del gate; total unlock→onUnlock = 1500ms
  OUTER_STEPS: 12,
  INNER_STEPS: 10,
  OUTER_RADIUS: 180,
  INNER_RADIUS: 118,
  OUTER_SIZE: 390,
  INNER_SIZE: 264,
  WHEEL_BASE: 440,
  DEG_OUTER: 360 / 12, // 30°
  DEG_INNER: 360 / 10, // 36°
} as const;

export const VAULT_UNIVERSAL: VaultCombination = {
  outer: 'esmeralda',
  inner: 7,
};

export const VAULT_SYMBOLS: readonly VaultSymbolMeta[] = [
  { id: 'esmeralda', name: 'Esmeralda', color: goldAccent.primary },
  { id: 'sol', name: 'Sol', color: '#E5C866' },
  { id: 'luna', name: 'Luna', color: '#C0C0C0' },
  { id: 'montana', name: 'Montaña', color: emeraldCore.primary },
  { id: 'rio', name: 'Río', color: '#4A90E2' },
  { id: 'arbol', name: 'Árbol', color: emeraldCore.dark },
  { id: 'ojo', name: 'Ojo', color: goldAccent.dark },
  { id: 'estrella', name: 'Estrella', color: '#E5C866' },
  { id: 'condor', name: 'Cóndor', color: '#8B7355' },
  { id: 'jaguar', name: 'Jaguar', color: '#D4AF37' },
  { id: 'espiral', name: 'Espiral', color: emeraldCore.light },
  { id: 'corazon_verde', name: 'Corazón Verde', color: emeraldCore.primary },
] as const;

export const vaultPalette = {
  bg: '#0A0604',
  bgOverlay: 'rgba(0, 0, 0, 0.82)',
  steel: '#2E2823',
  steelLight: '#5C5148',
  gold: goldAccent.primary,
  goldGlow: 'rgba(212, 175, 55, 0.55)',
  emerald: emeraldCore.primary,
  error: '#C94C4C',
  textMuted: 'rgba(255, 255, 255, 0.55)',
  textOnGold: '#0A0604',
} as const;
```

- [ ] **Step 1.3: Verificar tipos**

Run: `npm run lint`
Expected: PASS (no errores de tipo).

- [ ] **Step 1.4: Commit**

```bash
git add src/types/vault.ts src/config/vault.ts
git commit -m "feat(vault): add types and config (T9.1)

- VaultSymbolId union + VaultCombination + VaultState types
- VAULT_CONFIG constants (steps, radii, timings)
- VAULT_UNIVERSAL combination (esmeralda + 7)
- VAULT_SYMBOLS list of 12 TM symbols
- vaultPalette (bóveda bancaria colors)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Util `parseVaultCode` con tests

**Files:**
- Create: `src/utils/parseVaultCode.ts`
- Create: `src/utils/parseVaultCode.test.ts`

- [ ] **Step 2.1: Escribir test failing**

Crea `src/utils/parseVaultCode.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseVaultCode } from './parseVaultCode';

describe('parseVaultCode', () => {
  it('parses valid "symbol:digit" string', () => {
    expect(parseVaultCode('corazon_verde:3')).toEqual({
      outer: 'corazon_verde',
      inner: 3,
    });
  });

  it('parses "esmeralda:7" (universal-like)', () => {
    expect(parseVaultCode('esmeralda:7')).toEqual({
      outer: 'esmeralda',
      inner: 7,
    });
  });

  it('returns null for null/empty input', () => {
    expect(parseVaultCode(null)).toBeNull();
    expect(parseVaultCode('')).toBeNull();
    expect(parseVaultCode('   ')).toBeNull();
  });

  it('returns null when symbol is unknown', () => {
    expect(parseVaultCode('unknown_symbol:3')).toBeNull();
    expect(parseVaultCode('xyz:5')).toBeNull();
  });

  it('returns null when digit is out of range', () => {
    expect(parseVaultCode('jaguar:10')).toBeNull();
    expect(parseVaultCode('jaguar:-1')).toBeNull();
    expect(parseVaultCode('jaguar:99')).toBeNull();
  });

  it('returns null when digit is not a number', () => {
    expect(parseVaultCode('jaguar:abc')).toBeNull();
    expect(parseVaultCode('jaguar:')).toBeNull();
  });

  it('returns null when format is wrong', () => {
    expect(parseVaultCode('jaguar')).toBeNull();
    expect(parseVaultCode(':3')).toBeNull();
    expect(parseVaultCode('jaguar:3:extra')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(parseVaultCode('  jaguar:3  ')).toEqual({
      outer: 'jaguar',
      inner: 3,
    });
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

Run: `npm run test:unit -- parseVaultCode`
Expected: FAIL with "Cannot find module './parseVaultCode'".

- [ ] **Step 2.3: Implementar `parseVaultCode.ts`**

```ts
import { VAULT_SYMBOLS } from '../config/vault';
import type { VaultCombination, VaultSymbolId } from '../types/vault';

const VALID_SYMBOL_IDS = new Set<string>(VAULT_SYMBOLS.map((s) => s.id));

/**
 * Parses a string of shape "symbol:digit" into a VaultCombination.
 * Returns null for any malformed input.
 *
 * Accepted: "corazon_verde:3", " jaguar:7 " (trimmed).
 * Rejected: null, empty, unknown symbol, digit outside 0-9, bad format.
 */
export function parseVaultCode(raw: string | null | undefined): VaultCombination | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const parts = trimmed.split(':');
  if (parts.length !== 2) return null;

  const [symbol, digitStr] = parts;
  if (!symbol || !digitStr) return null;
  if (!VALID_SYMBOL_IDS.has(symbol)) return null;

  const inner = Number.parseInt(digitStr, 10);
  if (!Number.isInteger(inner)) return null;
  if (inner < 0 || inner > 9) return null;
  if (String(inner) !== digitStr.trim()) return null; // rechaza "3abc", "3.5"

  return { outer: symbol as VaultSymbolId, inner };
}
```

- [ ] **Step 2.4: Run test to verify it passes**

Run: `npm run test:unit -- parseVaultCode`
Expected: PASS (8 tests pass).

- [ ] **Step 2.5: Commit**

```bash
git add src/utils/parseVaultCode.ts src/utils/parseVaultCode.test.ts
git commit -m "feat(vault): add parseVaultCode util with tests (T9.1)

Parses 'symbol:digit' strings from the asesores Sheet vaultCode column
into VaultCombination. Defensive against malformed input.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Hook `useVaultUnlock` — lógica central + tests

**Files:**
- Create: `src/hooks/useVaultUnlock.ts`
- Create: `src/hooks/useVaultUnlock.test.ts`

El hook encapsula toda la lógica de validación, attempts, cooldown y persistencia. Los consumers (el `VaultLockScreen`) solo se preocupan de renderizar.

- [ ] **Step 3.1: Escribir tests failing**

Crea `src/hooks/useVaultUnlock.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVaultUnlock } from './useVaultUnlock';
import { VAULT_STORAGE, VAULT_UNIVERSAL, VAULT_SYMBOLS, VAULT_CONFIG } from '../config/vault';
import type { VaultCombination } from '../types/vault';

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
      result.current.setOuterIdx(1); // no universal, no override
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
      // After error, state returns to idle after shake duration
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

    // Enter cooldown
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

    // Set valid combination; tryUnlock should NOT unlock during cooldown
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
    const future = Date.now() + 60_000; // 60s remaining
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
```

- [ ] **Step 3.2: Instalar `@testing-library/react` como devDep**

Los tests del hook necesitan `renderHook`. El repo no lo tiene.

```bash
npm install --save-dev --save-exact @testing-library/react@16.1.0 @testing-library/dom@10.4.0 jsdom@25.0.1
```

Verify:
```bash
grep -E "testing-library|jsdom" package.json
```
Expected: salen las 3 nuevas deps.

- [ ] **Step 3.3: Configurar Vitest para jsdom**

Busca `vitest.config.*` o `vite.config.*` con config de test:

```bash
ls vitest.config.* vite.config.* 2>/dev/null
```

Si existe `vitest.config.ts`:
- Asegúrate que tenga `test: { environment: 'jsdom' }`.

Si NO existe, crea `vitest.config.ts` en la raíz:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '**/e2e/**'],
  },
});
```

- [ ] **Step 3.4: Run test to verify it fails**

Run: `npm run test:unit -- useVaultUnlock`
Expected: FAIL with "Cannot find module './useVaultUnlock'" (correcto — aún no existe).

- [ ] **Step 3.5: Implementar `useVaultUnlock.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  VAULT_CONFIG,
  VAULT_STORAGE,
  VAULT_SYMBOLS,
  VAULT_UNIVERSAL,
} from '../config/vault';
import type { VaultCombination, VaultState } from '../types/vault';

export interface UseVaultUnlockOptions {
  ambassadorCodes?: Map<string, VaultCombination>;
}

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

  const cooldownUntil = cooldownRaw ? Number.parseInt(cooldownRaw, 10) : null;
  const attemptsUsed = attemptsRaw ? Number.parseInt(attemptsRaw, 10) : 0;
  const attemptsLeft = Math.max(0, VAULT_CONFIG.MAX_ATTEMPTS - attemptsUsed);

  if (cooldownUntil && cooldownUntil > Date.now()) {
    return { state: 'cooldown', attemptsLeft: 0, cooldownUntil };
  }

  // Cooldown expired or absent — reset storage.
  if (cooldownUntil) {
    safeRemoveItem(VAULT_STORAGE.COOLDOWN_UNTIL);
    safeRemoveItem(VAULT_STORAGE.ATTEMPTS);
    return { state: 'idle', attemptsLeft: VAULT_CONFIG.MAX_ATTEMPTS, cooldownUntil: null };
  }

  return { state: 'idle', attemptsLeft, cooldownUntil: null };
}

export function useVaultUnlock(options: UseVaultUnlockOptions = {}): UseVaultUnlockReturn {
  const { ambassadorCodes } = options;

  const [outerIdx, setOuterIdx] = useState(0);
  const [innerIdx, setInnerIdx] = useState(0);

  const initial = useRef(readInitialState());
  const [state, setState] = useState<VaultState>(initial.current.state);
  const [attemptsLeft, setAttemptsLeft] = useState(initial.current.attemptsLeft);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(
    initial.current.cooldownUntil,
  );
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(
    initial.current.cooldownUntil
      ? Math.max(0, Math.ceil((initial.current.cooldownUntil - Date.now()) / 1000))
      : 0,
  );

  const shakeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Tick down cooldown every second, exit when 0 or state changes. */
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

  /** Clear any pending shake timeout on unmount. */
  useEffect(() => {
    return () => {
      if (shakeTimeout.current) {
        clearTimeout(shakeTimeout.current);
      }
    };
  }, []);

  const tryUnlock = useCallback(() => {
    if (state === 'unlocking' || state === 'cooldown') return;

    const outerId = VAULT_SYMBOLS[outerIdx]?.id;
    if (!outerId) return;
    const candidate: VaultCombination = { outer: outerId, inner: innerIdx };

    // 1. Universal?
    if (candidate.outer === VAULT_UNIVERSAL.outer && candidate.inner === VAULT_UNIVERSAL.inner) {
      safeSetItem(VAULT_STORAGE.UNLOCKED, 'true');
      safeSetItem(VAULT_STORAGE.UNLOCK_METHOD, 'universal');
      safeRemoveItem(VAULT_STORAGE.ATTEMPTS);
      safeRemoveItem(VAULT_STORAGE.COOLDOWN_UNTIL);
      setState('unlocking');
      return;
    }

    // 2. Ambassador override?
    if (ambassadorCodes) {
      for (const [slug, combo] of ambassadorCodes) {
        if (combo.outer === candidate.outer && combo.inner === candidate.inner) {
          safeSetItem(VAULT_STORAGE.UNLOCKED, 'true');
          safeSetItem(VAULT_STORAGE.UNLOCK_METHOD, `ambassador:${slug}`);
          safeRemoveItem(VAULT_STORAGE.ATTEMPTS);
          safeRemoveItem(VAULT_STORAGE.COOLDOWN_UNTIL);
          setState('unlocking');
          return;
        }
      }
    }

    // 3. Miss.
    const usedBefore = VAULT_CONFIG.MAX_ATTEMPTS - attemptsLeft;
    const usedNow = usedBefore + 1;
    const remaining = Math.max(0, VAULT_CONFIG.MAX_ATTEMPTS - usedNow);

    safeSetItem(VAULT_STORAGE.ATTEMPTS, String(usedNow));
    setAttemptsLeft(remaining);
    setState('error');

    if (remaining === 0) {
      const until = Date.now() + VAULT_CONFIG.COOLDOWN_MS;
      safeSetItem(VAULT_STORAGE.COOLDOWN_UNTIL, String(until));
      setCooldownUntil(until);
      setCooldownSecondsLeft(Math.ceil(VAULT_CONFIG.COOLDOWN_MS / 1000));
      // shake briefly, then transition to cooldown
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
  }, [state, outerIdx, innerIdx, ambassadorCodes, attemptsLeft]);

  const reset = useCallback(() => {
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
```

- [ ] **Step 3.6: Run tests to verify they pass**

Run: `npm run test:unit -- useVaultUnlock`
Expected: PASS (10 tests).

Si algún test falla (timing, timers), ajusta `vi.advanceTimersByTime` en los tests pero NO relajes la lógica del hook — el test es la especificación.

- [ ] **Step 3.7: Commit**

```bash
git add src/hooks/useVaultUnlock.ts src/hooks/useVaultUnlock.test.ts package.json package-lock.json vitest.config.ts
git commit -m "feat(vault): add useVaultUnlock hook with cooldown + persistence (T9.1)

- Universal + ambassador override combination validation
- 3 attempts → 5min cooldown, rehydrated from localStorage
- Safe localStorage wrappers for Safari private mode
- Synchronous initial state read (anti-blinking)
- Unit tests (@testing-library/react + jsdom) covering match/miss/cooldown/rehydrate

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Componente `VaultSymbol` — 12 SVGs inline

**Files:**
- Create: `src/components/vault/VaultSymbol.tsx`

Cada símbolo es un SVG monocromático de 24×24 viewBox que se tinta con `currentColor`. El consumer pasa `color` via style/sx.

- [ ] **Step 4.1: Implementar `VaultSymbol.tsx`**

```tsx
import type { VaultSymbolId } from '../../types/vault';

interface VaultSymbolProps {
  id: VaultSymbolId;
  size?: number;
  color?: string;
  className?: string;
  'aria-hidden'?: boolean;
}

/** 12 SVG paths — each uses currentColor; size is 24x24 viewBox. */
const SYMBOL_PATHS: Record<VaultSymbolId, string> = {
  esmeralda:
    'M12 2 L20 9 L17 20 L7 20 L4 9 Z M12 2 L12 9 M4 9 L20 9',
  sol:
    'M12 5 A4 4 0 1 1 11.99 5 Z M12 1 L12 3 M12 21 L12 23 M4.22 4.22 L5.64 5.64 M18.36 18.36 L19.78 19.78 M1 12 L3 12 M21 12 L23 12 M4.22 19.78 L5.64 18.36 M18.36 5.64 L19.78 4.22',
  luna:
    'M20 15 A8 8 0 1 1 9 4 A6 6 0 0 0 20 15 Z',
  montana:
    'M3 20 L9 8 L13 14 L16 10 L21 20 Z',
  rio:
    'M2 8 Q6 4 10 8 T18 8 T22 8 M2 16 Q6 12 10 16 T18 16 T22 16',
  arbol:
    'M12 2 C8 5 7 9 8 12 L10 12 L10 20 L14 20 L14 12 L16 12 C17 9 16 5 12 2 Z',
  ojo:
    'M2 12 Q7 4 12 4 Q17 4 22 12 Q17 20 12 20 Q7 20 2 12 Z M12 8 A4 4 0 1 1 11.99 8 Z M12 10 A2 2 0 1 1 11.99 10 Z',
  estrella:
    'M12 2 L14 9 L21 9 L15.5 13.5 L17.5 20.5 L12 16 L6.5 20.5 L8.5 13.5 L3 9 L10 9 Z',
  condor:
    'M2 14 Q6 8 12 10 Q18 8 22 14 L20 16 Q15 12 12 13 Q9 12 4 16 Z M12 10 L12 18',
  jaguar:
    'M4 4 L8 4 L8 8 L4 8 Z M10 6 L14 6 L14 10 L10 10 Z M16 4 L20 4 L20 8 L16 8 Z M4 12 L8 12 L8 16 L4 16 Z M10 14 L14 14 L14 18 L10 18 Z M16 12 L20 12 L20 16 L16 16 Z',
  espiral:
    'M12 12 m0 -8 A8 8 0 1 1 4 12 A6 6 0 1 1 12 6 A4 4 0 1 1 10 12 A2 2 0 1 1 12 10',
  corazon_verde:
    'M12 20 L4 12 A4 4 0 0 1 12 7 A4 4 0 0 1 20 12 Z',
};

/**
 * Renders one of the 12 Tierra Mädre vault symbols as an inline SVG.
 * Uses `currentColor` for fill/stroke — pass `color` to tint.
 */
export function VaultSymbol({
  id,
  size = 28,
  color,
  className,
  'aria-hidden': ariaHidden = true,
}: VaultSymbolProps) {
  const d = SYMBOL_PATHS[id];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={color ? { color } : undefined}
      aria-hidden={ariaHidden}
      focusable="false"
    >
      <path
        d={d}
        fill={id === 'rio' || id === 'sol' ? 'none' : 'currentColor'}
        stroke="currentColor"
        strokeWidth={id === 'rio' ? 1.8 : 1}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
```

- [ ] **Step 4.2: Verificar compilación**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4.3: Commit**

```bash
git add src/components/vault/VaultSymbol.tsx
git commit -m "feat(vault): add VaultSymbol with 12 TM SVG paths (T9.1)

Inline monochromatic SVGs tinted via currentColor. Each path fits
24x24 viewBox. Symbols: esmeralda, sol, luna, montaña, río, árbol,
ojo, estrella, cóndor, jaguar, espiral, corazón verde.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Componente `VaultDialLabel` — label contrarrotante

**Files:**
- Create: `src/components/vault/VaultDialLabel.tsx`

Portado directo de `NawalLabel`/`TonoLabel` de cholqi, generalizado.

- [ ] **Step 5.1: Implementar `VaultDialLabel.tsx`**

```tsx
import { motion, useTransform, type MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';

interface VaultDialLabelProps {
  /** Contenido a renderizar (símbolo, dígito, lo que sea). */
  children: ReactNode;
  /** Índice de este label en el anillo. */
  index: number;
  /** Total de labels en el anillo (usado para calcular ángulo). */
  totalItems: number;
  /** Distancia del centro del anillo al label (px). */
  radius: number;
  /** MotionValue de la rotación del anillo padre. */
  ringRotate: MotionValue<number>;
  /** Ancho fijo del label (px). */
  width?: number;
}

/**
 * Posiciona el label en un punto del círculo y lo contrarrota con el spring del anillo
 * para que siempre quede horizontal al lector.
 */
export function VaultDialLabel({
  children,
  index,
  totalItems,
  radius,
  ringRotate,
  width = 64,
}: VaultDialLabelProps) {
  const itemDeg = 360 / totalItems;
  const rot = index * itemDeg;
  const labelRotate = useTransform(ringRotate, (v) => -rot - v);

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transformOrigin: 'center center',
        transform: `rotate(${rot}deg)`,
        pointerEvents: 'none',
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          left: '50%',
          x: '-50%',
          y: -radius,
          rotate: labelRotate,
          width,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 5.2: Verificar compilación**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5.3: Commit**

```bash
git add src/components/vault/VaultDialLabel.tsx
git commit -m "feat(vault): add VaultDialLabel with counter-rotation (T9.1)

Generic label positioned on a ring, counter-rotated to stay horizontal.
Uses framer-motion useTransform on parent spring value.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Componente `VaultDial` — anillo genérico drag + snap

**Files:**
- Create: `src/components/vault/VaultDial.tsx`

Core del gate. Maneja pointer events, ángulo acumulativo, snap al soltar, spring, teclado.

- [ ] **Step 6.1: Implementar `VaultDial.tsx`**

```tsx
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type MotionValue,
} from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { vaultPalette } from '../../config/vault';

export interface VaultDialItem {
  id: string;
  label: ReactNode;
  /** Optional color applied to the label wrapper. */
  color?: string;
}

interface VaultDialProps {
  items: VaultDialItem[];
  value: number;
  onChange: (index: number) => void;
  size: number;
  radius: number;
  disabled?: boolean;
  ariaLabel: string;
  /** Render prop for each label — receives the item and the ring's rotation. */
  renderLabel: (item: VaultDialItem, index: number, ringRotate: MotionValue<number>) => ReactNode;
}

function springCfg(reduce: boolean | null) {
  return reduce
    ? { stiffness: 520, damping: 44, mass: 0.35 }
    : { stiffness: 300, damping: 28, mass: 0.8 };
}

function normalizeDelta(delta: number): number {
  let d = delta;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

/**
 * Generic rotary dial — renders items on a ring, drag to rotate, release to snap.
 * Emits onChange with the new selected index after snap.
 */
export function VaultDial({
  items,
  value,
  onChange,
  size,
  radius,
  disabled = false,
  ariaLabel,
  renderLabel,
}: VaultDialProps) {
  const reduceMotion = useReducedMotion();
  const totalItems = items.length;
  const stepDeg = 360 / totalItems;

  const cfg = useMemo(() => springCfg(reduceMotion), [reduceMotion]);
  const accumulated = useRef(-value * stepDeg);
  const motionTarget = useMotionValue(accumulated.current);
  const spring = useSpring(motionTarget, cfg);

  // Sync when value changes externally (e.g. keyboard or programmatic).
  useEffect(() => {
    const expected = Math.round(accumulated.current / stepDeg) * stepDeg;
    const currentIndex = ((Math.round(-expected / stepDeg)) % totalItems + totalItems) % totalItems;
    if (currentIndex !== value) {
      accumulated.current = -value * stepDeg;
      motionTarget.set(accumulated.current);
    }
  }, [value, stepDeg, totalItems, motionTarget]);

  const ringRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const prevAngle = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const pointerAngle = useCallback((e: React.PointerEvent) => {
    const el = ringRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return (
      Math.atan2(
        e.clientY - (rect.top + rect.height / 2),
        e.clientX - (rect.left + rect.width / 2),
      ) *
      (180 / Math.PI)
    );
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragging.current = true;
      setIsDragging(true);
      prevAngle.current = pointerAngle(e);
    },
    [disabled, pointerAngle],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const now = pointerAngle(e);
      const delta = normalizeDelta(now - prevAngle.current);
      accumulated.current += delta;
      motionTarget.set(accumulated.current);
      prevAngle.current = now;
    },
    [pointerAngle, motionTarget],
  );

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    const snapped = Math.round(accumulated.current / stepDeg) * stepDeg;
    accumulated.current = snapped;
    motionTarget.set(snapped);
    const newIndex = ((Math.round(-snapped / stepDeg)) % totalItems + totalItems) % totalItems;
    if (newIndex !== value) onChange(newIndex);
  }, [stepDeg, totalItems, motionTarget, value, onChange]);

  // Keyboard accessibility.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      let next = value;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          next = (value + (e.shiftKey ? 3 : 1)) % totalItems;
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          next = (value - (e.shiftKey ? 3 : 1) + totalItems * 2) % totalItems;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = totalItems - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      onChange(next);
    },
    [value, totalItems, onChange, disabled],
  );

  return (
    <motion.div
      ref={ringRef}
      role="slider"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={totalItems - 1}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1px solid ${vaultPalette.steel}`,
        backgroundColor: 'rgba(10, 6, 4, 0.7)',
        boxShadow: `inset 0 0 60px rgba(0, 0, 0, 0.4), 0 0 30px rgba(212, 175, 55, 0.06)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        cursor: disabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        rotate: spring,
        outline: 'none',
        willChange: isDragging ? 'transform' : undefined,
      }}
    >
      {items.map((item, i) => renderLabel(item, i, spring))}
    </motion.div>
  );
}
```

- [ ] **Step 6.2: Verificar compilación**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 6.3: Commit**

```bash
git add src/components/vault/VaultDial.tsx
git commit -m "feat(vault): add VaultDial with drag + snap + keyboard (T9.1)

- Pointer events with setPointerCapture (mobile-safe)
- Cumulative angle tracking (no 'long way around')
- Snap to nearest step on pointer up, emits onChange
- Keyboard slider (arrows ± step, shift+arrow ± 3, Home/End)
- prefers-reduced-motion aware spring config
- role='slider' with aria-valuenow/min/max

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Componente `VaultCenter` — hub central con estado

**Files:**
- Create: `src/components/vault/VaultCenter.tsx`

- [ ] **Step 7.1: Implementar `VaultCenter.tsx`**

```tsx
import { Box } from '@mui/material';
import { Lock } from 'lucide-react';
import { vaultPalette } from '../../config/vault';
import type { VaultState, VaultSymbolMeta } from '../../types/vault';
import { VaultSymbol } from './VaultSymbol';

interface VaultCenterProps {
  outerSymbol: VaultSymbolMeta;
  innerDigit: number;
  state: VaultState;
  cooldownSecondsLeft?: number;
}

function formatCooldown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function VaultCenter({
  outerSymbol,
  innerDigit,
  state,
  cooldownSecondsLeft = 0,
}: VaultCenterProps) {
  const isUnlocking = state === 'unlocking';
  const isError = state === 'error';
  const isCooldown = state === 'cooldown';

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'relative',
        zIndex: 10,
        width: { xs: 100, md: 108 },
        height: { xs: 100, md: 108 },
        borderRadius: '50%',
        border: '1px solid',
        borderColor: isUnlocking
          ? 'rgba(212, 175, 55, 0.7)'
          : isCooldown
            ? vaultPalette.error
            : 'rgba(212, 165, 116, 0.3)',
        background: isUnlocking
          ? `radial-gradient(circle, ${vaultPalette.goldGlow}, rgba(12, 6, 3, 0.9))`
          : 'radial-gradient(circle, rgba(20, 12, 8, 0.92), rgba(8, 4, 2, 0.97))',
        boxShadow: isUnlocking
          ? `0 0 50px ${vaultPalette.goldGlow}, inset 0 0 20px rgba(212, 175, 55, 0.15)`
          : '0 4px 24px rgba(0, 0, 0, 0.6)',
        transition: 'border-color 0.4s, background 0.4s, box-shadow 0.4s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: 1,
        animation: isError
          ? 'vaultShake 0.4s ease'
          : isUnlocking
            ? 'vaultGlow 1s ease-in-out'
            : undefined,
        '@keyframes vaultShake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        '@keyframes vaultGlow': {
          '0%': { boxShadow: '0 4px 24px rgba(0, 0, 0, 0.6)' },
          '50%': {
            boxShadow:
              '0 0 70px rgba(212, 175, 55, 0.7), 0 0 140px rgba(212, 175, 55, 0.25)',
          },
          '100%': {
            boxShadow:
              '0 0 50px rgba(212, 175, 55, 0.5), inset 0 0 20px rgba(212, 175, 55, 0.15)',
          },
        },
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none !important',
        },
      }}
    >
      {isCooldown ? (
        <>
          <Lock size={24} color={vaultPalette.gold} aria-hidden />
          <Box
            component="span"
            sx={{
              mt: 0.5,
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: vaultPalette.gold,
              fontVariantNumeric: 'tabular-nums',
            }}
            aria-label={`Bloqueado por ${formatCooldown(cooldownSecondsLeft)}`}
          >
            {formatCooldown(cooldownSecondsLeft)}
          </Box>
        </>
      ) : (
        <>
          <VaultSymbol id={outerSymbol.id} size={26} color={outerSymbol.color} />
          <Box
            component="span"
            sx={{
              mt: 0.5,
              fontFamily: '"Playfair Display", serif',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: outerSymbol.color,
              textShadow: '0 1px 6px rgba(0, 0, 0, 0.7)',
              lineHeight: 1,
            }}
          >
            {outerSymbol.name}
          </Box>
          <Box
            component="span"
            sx={{
              mt: 0.5,
              fontSize: '1.2rem',
              fontWeight: 700,
              color: vaultPalette.gold,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {innerDigit}
          </Box>
        </>
      )}
    </Box>
  );
}
```

- [ ] **Step 7.2: Verificar compilación**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 7.3: Commit**

```bash
git add src/components/vault/VaultCenter.tsx
git commit -m "feat(vault): add VaultCenter hub with state-driven visuals (T9.1)

- idle: dark radial, steel border
- unlocking: gold glow + vaultGlow keyframe (1s)
- error: vaultShake keyframe (400ms)
- cooldown: lock icon + mm:ss countdown
- prefers-reduced-motion disables keyframe animations

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Barrel + componente `VaultLockScreen` — orquestador

**Files:**
- Create: `src/components/vault/VaultLockScreen.tsx`
- Create: `src/components/vault/index.ts`

Reune todo: BG, overlay, título, 2 dials, center, botón, integra `useVaultUnlock`.

- [ ] **Step 8.1: Implementar `VaultLockScreen.tsx`**

```tsx
import { Box, Button, Typography, alpha } from '@mui/material';
import { motion, useReducedMotion, type MotionValue } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { VAULT_CONFIG, VAULT_SYMBOLS, vaultPalette } from '../../config/vault';
import { useVaultUnlock } from '../../hooks/useVaultUnlock';
import type { UnlockMethod, VaultCombination, VaultSymbolMeta } from '../../types/vault';
import { VaultCenter } from './VaultCenter';
import { VaultDial, type VaultDialItem } from './VaultDial';
import { VaultDialLabel } from './VaultDialLabel';
import { VaultSymbol } from './VaultSymbol';

export interface VaultLockScreenProps {
  onUnlock: (meta: UnlockMethod) => void;
  ambassadorCodes?: Map<string, VaultCombination>;
}

export function VaultLockScreen({ onUnlock, ambassadorCodes }: VaultLockScreenProps) {
  const reduceMotion = useReducedMotion();
  const {
    outerIdx,
    innerIdx,
    setOuterIdx,
    setInnerIdx,
    state,
    attemptsLeft,
    cooldownSecondsLeft,
    tryUnlock,
  } = useVaultUnlock({ ambassadorCodes });

  const outerSymbol: VaultSymbolMeta = VAULT_SYMBOLS[outerIdx];

  const wheelRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [fadeOut, setFadeOut] = useState(false);

  // Responsive scale.
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / VAULT_CONFIG.WHEEL_BASE));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Fire onUnlock after glow + fade.
  useEffect(() => {
    if (state !== 'unlocking') return;
    const glow = setTimeout(() => setFadeOut(true), VAULT_CONFIG.UNLOCK_ANIMATION_MS);
    const finish = setTimeout(() => {
      const raw = (() => {
        try {
          return localStorage.getItem('tm:vault:method');
        } catch {
          return null;
        }
      })();
      if (raw === 'universal') {
        onUnlock({ method: 'universal' });
      } else if (raw && raw.startsWith('ambassador:')) {
        onUnlock({ method: 'ambassador', ambassadorSlug: raw.slice('ambassador:'.length) });
      } else {
        onUnlock({ method: 'universal' });
      }
    }, VAULT_CONFIG.UNLOCK_ANIMATION_MS + VAULT_CONFIG.FADE_OUT_MS);
    return () => {
      clearTimeout(glow);
      clearTimeout(finish);
    };
  }, [state, onUnlock]);

  // Outer items (symbols).
  const outerItems: VaultDialItem[] = useMemo(
    () =>
      VAULT_SYMBOLS.map((s) => ({
        id: s.id,
        label: s.name,
        color: s.color,
      })),
    [],
  );

  // Inner items (digits 0-9).
  const innerItems: VaultDialItem[] = useMemo(
    () =>
      Array.from({ length: VAULT_CONFIG.INNER_STEPS }, (_, i) => ({
        id: String(i),
        label: i,
      })),
    [],
  );

  const renderOuterLabel = useCallback(
    (item: VaultDialItem, i: number, ringRotate: MotionValue<number>) => (
      <VaultDialLabel
        key={item.id}
        index={i}
        totalItems={VAULT_CONFIG.OUTER_STEPS}
        radius={VAULT_CONFIG.OUTER_RADIUS}
        ringRotate={ringRotate}
        width={72}
      >
        <VaultSymbol id={VAULT_SYMBOLS[i].id} size={22} color={item.color} />
        <Box
          component="span"
          sx={{
            mt: 0.3,
            fontSize: { xs: '9px', md: '10px' },
            fontWeight: 600,
            textAlign: 'center',
            lineHeight: 1.1,
            color: item.color,
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
          }}
        >
          {VAULT_SYMBOLS[i].name}
        </Box>
      </VaultDialLabel>
    ),
    [],
  );

  const renderInnerLabel = useCallback(
    (item: VaultDialItem, i: number, ringRotate: MotionValue<number>) => (
      <VaultDialLabel
        key={item.id}
        index={i}
        totalItems={VAULT_CONFIG.INNER_STEPS}
        radius={VAULT_CONFIG.INNER_RADIUS}
        ringRotate={ringRotate}
        width={40}
      >
        <Box
          component="span"
          sx={{
            fontFamily: '"Playfair Display", serif',
            fontSize: { xs: '18px', md: '20px' },
            fontWeight: 700,
            color: vaultPalette.gold,
            textShadow: '0 1px 6px rgba(0, 0, 0, 0.8)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {i}
        </Box>
      </VaultDialLabel>
    ),
    [],
  );

  const disabled = state === 'unlocking' || state === 'cooldown';

  const combinationLabel = `Combinación: ${outerSymbol.name}, ${innerIdx}`;

  return (
    <motion.div
      animate={fadeOut ? { opacity: 0, scale: 1.06 } : { opacity: 1, scale: 1 }}
      transition={{ duration: VAULT_CONFIG.FADE_OUT_MS / 1000, ease: 'easeIn' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background layers */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at center, ${vaultPalette.bg} 0%, #000 70%)`,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundColor: vaultPalette.bgOverlay,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Content */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          px: 2,
          py: 2.5,
          width: '100%',
          maxWidth: 460,
          paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontFamily: '"Playfair Display", serif',
            fontSize: '2.25rem',
            fontWeight: 700,
            color: '#fff',
            textShadow: '0 2px 12px rgba(0, 0, 0, 0.5)',
            letterSpacing: '-0.02em',
          }}
        >
          Bóveda Secreta
        </Typography>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: vaultPalette.textMuted,
            mt: -0.5,
            mb: 1,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Gira las ruedas y abre
        </Typography>

        {/* Wheel container */}
        <Box
          ref={wheelRef}
          role="img"
          aria-label={combinationLabel}
          sx={{
            position: 'relative',
            aspectRatio: '1 / 1',
            width: '100%',
            maxWidth: `min(92vw, ${VAULT_CONFIG.WHEEL_BASE}px)`,
          }}
        >
          {/* Top pointer */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              left: '50%',
              top: 0,
              transform: 'translateX(-50%)',
              zIndex: 20,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6))',
              width: 0,
              height: 0,
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: `20px solid ${vaultPalette.gold}`,
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${scale})`,
            }}
          >
            <VaultDial
              items={outerItems}
              value={outerIdx}
              onChange={setOuterIdx}
              size={VAULT_CONFIG.OUTER_SIZE}
              radius={VAULT_CONFIG.OUTER_RADIUS}
              disabled={disabled}
              ariaLabel="Anillo exterior: símbolo"
              renderLabel={renderOuterLabel}
            />
            <VaultDial
              items={innerItems}
              value={innerIdx}
              onChange={setInnerIdx}
              size={VAULT_CONFIG.INNER_SIZE}
              radius={VAULT_CONFIG.INNER_RADIUS}
              disabled={disabled}
              ariaLabel="Anillo interior: dígito"
              renderLabel={renderInnerLabel}
            />
            <VaultCenter
              outerSymbol={outerSymbol}
              innerDigit={innerIdx}
              state={state}
              cooldownSecondsLeft={cooldownSecondsLeft}
            />
          </Box>
        </Box>

        {/* Error / attempt feedback */}
        <Box
          aria-live="polite"
          sx={{
            height: 20,
            mt: 0.5,
            fontSize: '0.75rem',
            color: vaultPalette.error,
            textAlign: 'center',
          }}
        >
          {state === 'error' &&
            (attemptsLeft > 0
              ? `Combinación incorrecta. ${attemptsLeft} intento${attemptsLeft === 1 ? '' : 's'} restante${attemptsLeft === 1 ? '' : 's'}.`
              : 'Demasiados intentos. Bóveda bloqueada.')}
        </Box>

        {/* Confirm */}
        <Button
          onClick={tryUnlock}
          disabled={disabled}
          aria-label="Confirmar combinación"
          sx={{
            minWidth: 130,
            height: 46,
            borderRadius: '14px',
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.85)',
            backgroundColor: alpha(vaultPalette.gold, 0.12),
            border: `1px solid ${alpha(vaultPalette.gold, 0.3)}`,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
            mt: 1,
            '&:hover': {
              backgroundColor: alpha(vaultPalette.gold, 0.2),
              borderColor: alpha(vaultPalette.gold, 0.45),
            },
            '&:active': {
              backgroundColor: alpha(vaultPalette.gold, 0.25),
            },
            '&.Mui-disabled': {
              color: 'rgba(255, 255, 255, 0.4)',
              borderColor: alpha(vaultPalette.gold, 0.2),
              backgroundColor: alpha(vaultPalette.gold, 0.05),
            },
          }}
          {...(reduceMotion
            ? {}
            : {
                component: motion.button as unknown as 'button',
                whileTap: { scale: 0.95 },
              })}
        >
          {state === 'unlocking' ? <Lock size={16} color={vaultPalette.gold} /> : 'Abrir'}
        </Button>
      </Box>
    </motion.div>
  );
}
```

- [ ] **Step 8.2: Crear `src/components/vault/index.ts` (barrel)**

```ts
export { VaultLockScreen } from './VaultLockScreen';
export type { VaultLockScreenProps } from './VaultLockScreen';
export { VaultDial } from './VaultDial';
export type { VaultDialItem } from './VaultDial';
export { VaultDialLabel } from './VaultDialLabel';
export { VaultCenter } from './VaultCenter';
export { VaultSymbol } from './VaultSymbol';
```

- [ ] **Step 8.3: Verificar compilación y tests**

Run: `npm run lint && npm run test:unit`
Expected: PASS en ambos.

- [ ] **Step 8.4: Commit**

```bash
git add src/components/vault/VaultLockScreen.tsx src/components/vault/index.ts
git commit -m "feat(vault): add VaultLockScreen orchestrator + barrel (T9.1)

- Composes VaultDial × 2 + VaultCenter + button on dark-blur shell
- Consumes useVaultUnlock, fires onUnlock after glow + fade (1500ms)
- Respects safe-area-inset, prefers-reduced-motion
- aria-live error feedback with attempts-left copy

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Extender API + `useAsesores` con `vaultCode`

**Files:**
- Modify: `api/get-asesores.ts` (lectura de columna)
- Modify: `src/hooks/useAsesores.ts` (extender `Asesor` interface + exposición memoizada de `ambassadorVaultCodes`)

- [ ] **Step 9.1: Agregar columna `vaultCode` al API**

Edit `api/get-asesores.ts`.

Busca la línea que define `GetAsesoresRow` (línea ~26). Agrega el campo:

```ts
export interface GetAsesoresRow {
  id: string;
  name: string;
  slug: string;
  role: string;
  whatsapp: string | null;
  especialidad: string | null;
  email: string | null;
  photoFileId?: string;
  photoUrl?: string;
  vaultCode: string | null;         // NEW — format 'symbolId:digit' or null
}
```

Busca las declaraciones de `const roleIndex = findColumnIndex(...)` (línea ~84). Agrega después:

```ts
const vaultCodeIndex = findColumnIndex(headers, ['vaultcode', 'vault_code', 'codigo_boveda', 'bóveda', 'boveda']);
```

Busca el `asesoresData.push({ ... })` (línea ~109). Agrega el nuevo campo al objeto:

```ts
asesoresData.push({
  id: `asesor_${index + 1}`,
  name: displayName,
  slug: displayName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, ''),
  role: roleIndex !== -1 ? (row[roleIndex] || 'Asesor').trim() : 'Asesor',
  whatsapp: whatsappIndex !== -1 ? row[whatsappIndex] || null : null,
  especialidad: especialidadIndex !== -1 ? row[especialidadIndex] || null : null,
  email: cleanEmail,
  vaultCode: vaultCodeIndex !== -1 ? (row[vaultCodeIndex] ? String(row[vaultCodeIndex]).trim() : null) : null,
});
```

- [ ] **Step 9.2: Verificar compilación del API**

Run: `npm run lint`
Expected: PASS (incluye `tsc --noEmit -p api/tsconfig.json`).

- [ ] **Step 9.3: Extender `Asesor` interface y exponer `ambassadorVaultCodes`**

Edit `src/hooks/useAsesores.ts`.

Busca la `interface Asesor` (línea 9). Agrega:

```ts
export interface Asesor {
  id: string;
  name: string;
  slug: string;
  role?: string;
  whatsapp?: string | null;
  especialidad?: string | null;
  email?: string | null;
  photoFileId?: string;
  photoUrl?: string;
  productCount?: number;
  products?: TreasureItem[];
  vaultCode?: string | null;        // NEW
}
```

Busca el `UseAsesoresReturn` interface (línea ~23). Agrega:

```ts
interface UseAsesoresReturn {
  asesores: Asesor[];
  isLoading: boolean;
  error: string | null;
  refreshAsesores: () => Promise<void>;
  ambassadorVaultCodes: Map<string, VaultCombination>;
}
```

Agrega el import en la línea 4:

```ts
import { useMemo } from 'react';
import { parseVaultCode } from '../utils/parseVaultCode';
import type { VaultCombination } from '../types/vault';
```

(Si `useMemo` ya está importado en la línea 1, no lo dupliques.)

En el cuerpo del hook, justo antes del `return`, agrega la derivación:

```ts
const ambassadorVaultCodes = useMemo(() => {
  const map = new Map<string, VaultCombination>();
  for (const a of asesores) {
    const combo = parseVaultCode(a.vaultCode ?? null);
    if (combo) map.set(a.slug, combo);
  }
  return map;
}, [asesores]);
```

Luego agrega `ambassadorVaultCodes` al objeto retornado.

- [ ] **Step 9.4: Verificar compilación**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 9.5: Commit**

```bash
git add api/get-asesores.ts src/hooks/useAsesores.ts
git commit -m "feat(vault): read vaultCode column from Sheet + expose via useAsesores (T9.1)

- api/get-asesores.ts reads 'vaultCode' header alias, returns trimmed string or null
- useAsesores exposes memoized Map<slug, VaultCombination> via parseVaultCode
- Unknown/malformed codes are dropped silently (universal still works)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Envolver `VaultPage` con el gate

**Files:**
- Modify: `src/pages/VaultPage.tsx`

- [ ] **Step 10.1: Wrappear `VaultPage.tsx`**

Edit `src/pages/VaultPage.tsx`.

Reemplaza las líneas 1-18 (imports + comentario + `const VaultPage`) por:

```tsx
/**
 * VaultPage Component
 *
 * Bóveda Secreta — Gate de acceso con dos anillos concéntricos (T9.1).
 * Si el usuario no ha desbloqueado, muestra VaultLockScreen.
 * Tras desbloquear, renderiza el contenido actual (placeholder hasta T9.2).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Paper, alpha } from '@mui/material';
import { Lock, Sparkles, Crown, Shield, Upload } from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { emeraldCore, goldAccent } from '../design-system/tokens/colors';
import { iosTypographyScale } from '../design-system';
import { VaultLockScreen } from '../components/vault';
import { VAULT_STORAGE } from '../config/vault';
import { useAsesores } from '../hooks/useAsesores';
import type { UnlockMethod } from '../types/vault';

const VaultPage: React.FC = () => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const { ambassadorVaultCodes } = useAsesores();

  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(VAULT_STORAGE.UNLOCKED) === 'true';
    } catch {
      return false;
    }
  });

  // Revalidate on tab focus in case admin reset unlock in another tab.
  useEffect(() => {
    const onFocus = () => {
      try {
        setUnlocked(localStorage.getItem(VAULT_STORAGE.UNLOCKED) === 'true');
      } catch {
        /* no-op */
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleUnlock = useCallback((_meta: UnlockMethod) => {
    setUnlocked(true);
    // TODO(T9.3 analytics): track _meta.method with TrackingContext
  }, []);

  if (!unlocked) {
    return <VaultLockScreen onUnlock={handleUnlock} ambassadorCodes={ambassadorVaultCodes} />;
  }

  return (
```

El resto del archivo (líneas 19+ originales, que empiezan con `<Box>`) queda intacto.

- [ ] **Step 10.2: Verificar build**

Run: `npm run lint && npm run test:unit`
Expected: PASS.

- [ ] **Step 10.3: Commit**

```bash
git add src/pages/VaultPage.tsx
git commit -m "feat(vault): gate VaultPage with VaultLockScreen (T9.1)

- Reads unlock state from localStorage synchronously (anti-blinking)
- Revalidates on window focus (admin can reset in another tab)
- Renders lockscreen when locked; current placeholder content when unlocked
- Wires ambassadorVaultCodes from useAsesores

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: QA manual — device matrix + a11y + build verify

**Files:** ninguno (solo validación)

Esta tarea es **checklist manual**; ninguna toca código.

- [ ] **Step 11.1: Dev server y smoke**

```bash
npm run dev
```

Abre `http://localhost:3000/vault` en Chrome escritorio. Verifica:
- [ ] VaultLockScreen se muestra full-bleed (header/nav ocultos debajo porque `position: fixed; z-index: 9999`).
- [ ] 12 símbolos visibles en el anillo exterior.
- [ ] Dígitos 0–9 visibles en el anillo interior.
- [ ] Centro inicial: "Esmeralda" con número `0`.
- [ ] Flecha dorada arriba como indicador.

- [ ] **Step 11.2: Drag feel**

- [ ] Click-drag en el anillo exterior rota suavemente con spring (no saltos bruscos).
- [ ] Al soltar, snap al símbolo más cercano.
- [ ] El centro actualiza al nuevo símbolo tras el snap.
- [ ] Igual con el anillo interior y los dígitos.

- [ ] **Step 11.3: Unlock path — universal**

- [ ] Gira hasta `Esmeralda` + dígito `7`. Tap "Abrir".
- [ ] El centro emite glow dorado ~1s, pantalla hace fade-out ~0.6s.
- [ ] Tras ~1.5s entras a `VaultPage` placeholder actual (con el texto "Próximamente").
- [ ] Recarga `/vault`: entras directo, sin re-pedir combinación.

- [ ] **Step 11.4: Reset para seguir probando**

Abre DevTools → Application → LocalStorage → borra `tm:vault:unlocked`. Recarga.

- [ ] **Step 11.5: Fail path — 3 intentos + cooldown**

- [ ] Ingresa 3 combinaciones incorrectas seguidas. Tras cada fallo, shake del centro + mensaje con intentos restantes.
- [ ] Tras el 3er fallo, los dials se deshabilitan (cursor `not-allowed`), el centro muestra icono Lock + contador `05:00` descontando por segundo.
- [ ] Tap "Abrir" durante cooldown no hace nada.
- [ ] Recarga: cooldown persiste con tiempo restante correcto.
- [ ] Espera (o manipula el epoch en localStorage: cambia `tm:vault:cooldown` a `Date.now() - 1`): state vuelve a idle y attempts resetea.

- [ ] **Step 11.6: Ambassador override**

- [ ] En Google Sheets de asesores, agrega/edita un asesor cualquiera con `vaultCode = "corazon_verde:3"`.
- [ ] Espera que se refresque la caché del API (hasta 5min, o hard-refresh con `Cmd+Shift+R`).
- [ ] En `/vault`, gira a `Corazón Verde` + `3`, "Abrir".
- [ ] Unlock exitoso. En DevTools, `localStorage.getItem('tm:vault:method')` debe ser `"ambassador:{slug}"`.

- [ ] **Step 11.7: Keyboard a11y**

- [ ] `Tab` enfoca cada dial. Con focus, `ArrowRight/ArrowLeft` rota un step.
- [ ] `Shift + Arrow` rota 3 steps.
- [ ] `Home` → primer item, `End` → último.
- [ ] `Tab` hasta el botón "Abrir", `Enter` o `Space` lo activa.

- [ ] **Step 11.8: Screen reader (macOS VoiceOver cmd+F5)**

- [ ] Focus en un dial anuncia "Anillo exterior: símbolo, deslizador".
- [ ] Al girar y soltar, `aria-live` anuncia la combinación actual.
- [ ] En cooldown, se anuncia "Bloqueado por 04:58".

- [ ] **Step 11.9: Reduced motion**

macOS: System Settings → Accessibility → Display → **Reduce motion** ON.

- [ ] Los anillos siguen arrastrando pero con spring más rígido (menos bounce).
- [ ] Unlock: sin animación de glow, sin fade — swap directo al contenido.
- [ ] Fail: sin shake, feedback solo por texto/color.

- [ ] **Step 11.10: Mobile — iPhone Safari real**

Conecta iPhone, abre http://{tu-ip-local}:3000/vault.
- [ ] Drag con dedo funciona — sin scroll accidental del viewport (`touch-action: none`).
- [ ] 60fps durante drag (Safari Web Inspector → Timeline).
- [ ] Safe-area respetada (título no tapado por notch).
- [ ] `viewport-fit=cover` ya debe venir del index.html; si no, verificar.

- [ ] **Step 11.11: Build final**

```bash
npm run build
```

Expected:
- [ ] Sin errores.
- [ ] `index.html` actualizó `APP_VERSION`.
- [ ] `public/version.json` actualizado.
- [ ] `dist/` generado.

- [ ] **Step 11.12: Commit del build (versión)**

```bash
git status --short
# Debe mostrar index.html, public/version.json modificados
git add index.html public/version.json
git commit -m "chore: bump APP_VERSION for T9.1 vault lockscreen"
```

---

## Task 12: Push y PR

- [ ] **Step 12.1: Push**

```bash
git push -u origin feat/t9-vault-lockscreen
```

- [ ] **Step 12.2: Abrir PR**

```bash
gh pr create --title "feat(t9): vault lockscreen gate with concentric dials" --body "$(cat <<'EOF'
## Summary

- T9.1 — gate de acceso a la Bóveda Secreta con dos anillos arrastrables
- 12 símbolos TM (exterior) + dígitos 0–9 (interior)
- Combinación universal (`esmeralda:7`) + overrides por embajador vía Sheet `vaultCode`
- 3 intentos → 5 min cooldown, persistido en localStorage
- Respeta prefers-reduced-motion y safe-area-inset
- `VaultPage.tsx` actual queda tal cual tras el unlock — galería/CTA/analytics en T9.2+

## Spec

`docs/specs/2026-04-22-tm-vault-lockscreen-design.md`

## Test plan

- [ ] Universal unlock (`Esmeralda` + `7`) → glow → `VaultPage` placeholder
- [ ] Override de embajador abre y registra `tm:vault:method = ambassador:{slug}`
- [ ] 3 fallos → cooldown 5min, persiste entre recargas
- [ ] Keyboard (Arrow/Shift+Arrow/Home/End) rota los dials
- [ ] Reduced motion desactiva glow/shake
- [ ] iPhone 12+ Safari: 60fps drag, touch-action OK, safe-area OK
- [ ] `npm run test:unit` verde (parseVaultCode + useVaultUnlock)
- [ ] `npm run build` sin errores, APP_VERSION bumpeado

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review (ejecutado antes de guardar)

**1. Spec coverage — cada sección del spec tiene una task:**
- §2 archivos → Task 1-10 cubren los 13 archivos.
- §3.1 `VaultDial` → Task 6.
- §3.2 `VaultDialLabel` → Task 5.
- §3.3 `VaultCenter` → Task 7.
- §3.4 `VaultSymbol` → Task 4.
- §3.5 `VaultLockScreen` → Task 8.
- §3.6 `useVaultUnlock` → Task 3.
- §4 `src/config/vault.ts` → Task 1.
- §5 `src/types/vault.ts` → Task 1.
- §6 API + Sheet vaultCode → Task 9.
- §7 data flow → cubierto por Task 3 (tryUnlock) + Task 6 (drag).
- §8 error handling → cubierto por Task 3 tests + Task 8 copy.
- §9 accesibilidad → cubierto por Task 6 (aria-slider + keyboard), Task 8 (aria-live), Task 11.7-11.9.
- §10 responsive + anti-blinking → Task 8 (ResizeObserver) + Task 10 (synchronous read).
- §11 integración VaultPage → Task 10.
- §12 testing → Task 2, 3 (Vitest).
- §13 criterios aceptación → Task 11 checklist manual.
- §14 fuera de alcance → no requiere task (documentado).
- §15 secuencia → respetada (config → hook → components → integración).
- §16 riesgos → mitigaciones ya aplicadas (fallback CSS gradient, localStorage try/catch).

**2. Placeholder scan:** El único comentario tipo `TODO` es el de `VaultPage.tsx` `TODO(T9.3 analytics): track _meta.method` — es intencional, marca explícitamente out-of-scope para futura subentrega, no es una pieza del plan actual. Todos los code blocks son completos y ejecutables.

**3. Type consistency:**
- `VaultCombination`, `VaultSymbolId`, `VaultState`, `UnlockMethod` definidos en Task 1 y usados consistentemente en Tasks 3, 8, 10.
- `VaultDialItem` definido en Task 6 y usado en Task 8.
- `UseVaultUnlockReturn` definido en Task 3 y consumido en Task 8 — mismos nombres de propiedad (`outerIdx`, `innerIdx`, `setOuterIdx`, `setInnerIdx`, `state`, `attemptsLeft`, `cooldownSecondsLeft`, `tryUnlock`, `reset`).
- `VAULT_STORAGE` keys idénticos entre `useVaultUnlock` (Task 3) y `VaultPage` (Task 10).
- `VAULT_CONFIG` usado por los mismos nombres de propiedad en Task 1, 3, 6, 8.

Plan listo para ejecutar.
