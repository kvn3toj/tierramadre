# Bóveda Secreta · Rediseño Cinematográfico — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la pantalla `VaultLockScreen` como una bóveda de banco cinematográfica (5 fases en 2400 ms, idle breath, failure con peso diferencial), preservando la API pública de unlock y los códigos de asesor.

**Architecture:** Tokens nuevos (paleta + motion) → componentes cinematográficos aislados → hook orquestador de la secuencia (state machine) → integración en `VaultLockScreen` que sustituye el árbol de render existente sin cambiar `useVaultUnlock` ni los storage keys. El sistema de audio es un módulo opcional (OFF por default, lazy AudioContext, fallback silencioso si los assets no existen).

**Tech Stack:** React 18 · TypeScript 5.6 · Vite · Material-UI v6 · Framer Motion 12 · Vitest 2 · Playfair Display (ya cargada)

**Spec base:** `docs/superpowers/specs/2026-04-22-boveda-secreta-rediseno-cinematografico-design.md`

---

## File Structure

### Files to create

| Path | Responsabilidad |
|---|---|
| `src/design-system/tokens/vault-cinema.ts` | Paleta + tipografía + dimensiones de la bóveda (data pura) |
| `src/design-system/tokens/vault-motion.ts` | Easing curves + duraciones por fase (data pura) |
| `src/hooks/useVaultReducedMotion.ts` | Hook: detecta `prefers-reduced-motion` + `document.visibilityState` |
| `src/components/vault/cinematic/VaultDoorFrame.tsx` | Marco circular: fondo radial + hairline rims + maker's mark |
| `src/components/vault/cinematic/VaultGemPointer.tsx` | Puntero superior + gema esmeralda + heartbeat + oil slick |
| `src/components/vault/cinematic/VaultMonumentCenter.tsx` | Centro tipográfico Playfair (nombre + separador + dígito) |
| `src/components/vault/cinematic/VaultCardinalRelease.tsx` | 4 hairlines + micro-esmeraldas cardinales con stagger |
| `src/components/vault/cinematic/VaultInterior.tsx` | Reveal del interior ámbar + camera dolly |
| `src/components/vault/cinematic/useVaultCinematicSequence.ts` | Hook orquestador: fases anticipate/confirm/release/swing/reveal/dolly/failure |
| `src/components/vault/audio/useVaultAudio.ts` | Lazy AudioContext + buffer cache + toggle persistente |
| `src/components/vault/audio/samples.ts` | Registry de samples (paths, volúmenes) |
| `tests/useVaultReducedMotion.test.ts` | Tests del hook reduced-motion |
| `tests/vault-cinematic-sequence.test.ts` | Tests de la state machine de la secuencia |
| `tests/vault-audio.test.ts` | Tests del toggle + lazy load |

### Files to modify

| Path | Cambio |
|---|---|
| `src/design-system/index.ts` | Exportar `vaultCinema`, `vaultEasing`, `vaultDurations` |
| `src/components/vault/VaultDial.tsx` | Añadir prop `focusMode` (calcula opacidad por distancia al activo) |
| `src/components/vault/VaultDialLabel.tsx` | Aceptar prop `opacity`; orientar siempre vertical (no rotar con el ring) |
| `src/components/vault/VaultLockScreen.tsx` | Reemplazar el árbol de render por composición de componentes cinematográficos |
| `src/components/vault/VaultCenter.tsx` | Marcar `@deprecated`, dejar shim que delega a `VaultMonumentCenter` |
| `src/config/vault.ts` | Marcar `vaultPalette` como `@deprecated`, re-export desde `vaultCinema` |
| `vitest.config.ts` | Añadir nuevos test files al glob de jsdom |

### Files preserved unchanged

- `src/hooks/useVaultUnlock.ts` (state machine + storage)
- `src/types/vault.ts`
- `src/utils/parseVaultCode.ts`
- `src/hooks/useVaultAccess.ts`
- `src/pages/VaultPage.tsx`
- `src/components/vault/VaultSymbol.tsx` (queda como helper deprecado)

---

### Task 1: Tokens de paleta y tipografía cinematográfica

**Files:**
- Create: `src/design-system/tokens/vault-cinema.ts`

- [ ] **Step 1: Create the tokens file**

```ts
// src/design-system/tokens/vault-cinema.ts
/**
 * Design tokens for the cinematic Bóveda Secreta lockscreen.
 * See docs/superpowers/specs/2026-04-22-boveda-secreta-rediseno-cinematografico-design.md
 */

export const vaultCinema = {
  color: {
    // Backgrounds
    ink: '#000000',
    nightDeep: '#030808',
    nightShadow: '#0a1a14',
    nightHint: '#152820',

    // Metal (oro envejecido, no saturado)
    goldAged: '#8a7329',
    champagne: '#c9a961',
    champagneBright: '#dfc383',

    // Gem
    emerald: '#00AE7A',
    emeraldLight: '#4de0b0',
    emeraldDeep: '#004a33',

    // Failure
    coral: '#C94C4C',

    // Interior reveal (ámbar cálido tras la puerta)
    interiorWarm: 'rgba(255, 200, 120, 0.6)',
    interiorMid: 'rgba(120, 70, 30, 0.4)',
    interiorDark: 'rgba(20, 10, 4, 0.8)',
  },

  alpha: {
    rimSoft: 0.18,
    rimMedium: 0.28,
    rimStrong: 0.4,
    inactiveLabel: 0.28,
    nearLabel: 0.6,
    activeLabel: 1.0,
    makerMark: 0.4,
  },

  typography: {
    family: '"Playfair Display", serif',
    metaFamily: '"DM Sans", system-ui, sans-serif',
    centerSymbolSize: 11,
    centerNumberSize: 34,
    centerNumberSizeLg: 42,
    dialDigitSize: 16,
    dialDigitSizeActive: 20,
    dialSymbolSize: 13,
    dialSymbolSizeActive: 14,
    makerMarkSize: 8,
    makerMarkLetterSpacing: '0.5em',
    centerSymbolLetterSpacing: '0.3em',
  },

  layout: {
    /** Diámetro virtual base — escala responsive desde aquí */
    wheelBase: 440,
    outerRingInset: '5%',
    innerRingDiameter: '56%',
    pointerHeight: 20,
    pointerWidth: 1,
    gemSize: 7,
    gemSizePulse: 9,
    cardinalGemSize: 5,
    rimHairlineWidth: 1,
  },
} as const;

export type VaultCinemaTokens = typeof vaultCinema;
```

- [ ] **Step 2: Run typecheck**

Run: `npm run lint`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/design-system/tokens/vault-cinema.ts
git commit -m "feat(vault-cinema): add color/typography/layout design tokens"
```

---

### Task 2: Tokens de motion (easing + durations)

**Files:**
- Create: `src/design-system/tokens/vault-motion.ts`

- [ ] **Step 1: Create the motion tokens file**

```ts
// src/design-system/tokens/vault-motion.ts
/**
 * Motion tokens for the cinematic Bóveda Secreta lockscreen.
 * Vocabulario reducido a 4 curvas. Ninguna nueva animación debe inventar bezier sueltos.
 */

export const vaultEasing = {
  /** easeOutQuint — entradas elegantes (gemas, glow, reveal). */
  silk: [0.22, 1, 0.36, 1] as const,
  /** Custom — swing de la puerta, sensación de masa. */
  weight: [0.33, 0.1, 0.25, 1] as const,
  /** Overshoot negativo — anticipación (Disney principle #1). */
  anticipate: [0.68, -0.55, 0.27, 1.55] as const,
  /** easeInOutSine — loops idle (breath, heartbeat). */
  breath: [0.42, 0, 0.58, 1] as const,
} as const;

/** CSS-string variants for use in `sx` / inline styles. */
export const vaultEasingCss = {
  silk: 'cubic-bezier(0.22, 1, 0.36, 1)',
  weight: 'cubic-bezier(0.33, 0.1, 0.25, 1)',
  anticipate: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  breath: 'cubic-bezier(0.42, 0, 0.58, 1)',
} as const;

/** Durations of each phase (ms). Total success sequence: 2400 ms. */
export const vaultDurations = {
  // Idle loops
  heartbeatMs: 2800,
  hubBreathMs: 3200,
  oilSlickMs: 20_000,
  shimmerIntervalMs: 8_000,
  shimmerSweepMs: 1_200,

  // Success sequence (overlapping phases — see spec section 5.3)
  anticipateMs: 80,
  confirmMs: 320,
  releaseMs: 500,
  releaseStaggerMs: 40,
  swingMs: 690,
  revealMs: 400,
  dollyMs: 300,
  /** Crossfade overlap: onUnlock dispatched 200 ms before container fully fades. */
  unlockCallbackOffsetMs: 2200,
  /** Total wall-clock duration of the success sequence. */
  sequenceTotalMs: 2400,

  // Failure
  failureShakeMs: 600,
  failureColorLerpMs: 300,
  failureColorRestoreMs: 1200,
  failureMisalignMs: 400,
  failureMessageDelayMs: 700,
  failureMessageMs: 200,

  // Reduced-motion total budget (no 3D, no overlap)
  reducedMotionTotalMs: 1100,
  reducedConfirmMs: 200,
  reducedReleaseMs: 300,
  reducedSwingMs: 400,
  reducedRevealMs: 200,

  // Cooldown
  cooldownPulseMs: 240,
  cooldownRestoreMs: 800,

  // Debounce de tryUnlock
  unlockDebounceMs: 800,
} as const;

export type VaultEasing = typeof vaultEasing;
export type VaultDurations = typeof vaultDurations;
```

- [ ] **Step 2: Run typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/design-system/tokens/vault-motion.ts
git commit -m "feat(vault-cinema): add motion tokens (easing curves + phase durations)"
```

---

### Task 3: Exportar nuevos tokens desde el design-system barrel

**Files:**
- Modify: `src/design-system/index.ts`

- [ ] **Step 1: Add exports near the existing motion exports (after line 133)**

Find the line `export { cssTransition, microinteraction } from './tokens/motion';` and add immediately after:

```ts
// Vault Cinema (cinematic lockscreen tokens)
export {
  vaultCinema,
  type VaultCinemaTokens,
} from './tokens/vault-cinema';
export {
  vaultEasing,
  vaultEasingCss,
  vaultDurations,
  type VaultEasing,
  type VaultDurations,
} from './tokens/vault-motion';
```

- [ ] **Step 2: Verify import path works**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/design-system/index.ts
git commit -m "feat(vault-cinema): export tokens from design-system barrel"
```

---

### Task 4: Hook `useVaultReducedMotion` (TDD)

Detecta `prefers-reduced-motion` + `document.visibilityState` y los expone como booleans reactivos. Esta es lógica pura — perfecta para TDD.

**Files:**
- Create: `tests/useVaultReducedMotion.test.ts`
- Create: `src/hooks/useVaultReducedMotion.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Add the new test file to vitest jsdom glob**

Edit `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    environmentMatchGlobs: [
      ['tests/useVaultUnlock.test.ts', 'jsdom'],
      ['tests/useVaultReducedMotion.test.ts', 'jsdom'],
      ['tests/vault-cinematic-sequence.test.ts', 'jsdom'],
      ['tests/vault-audio.test.ts', 'jsdom'],
    ],
  },
});
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/useVaultReducedMotion.test.ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:unit -- tests/useVaultReducedMotion.test.ts`
Expected: FAIL with "Cannot find module '../src/hooks/useVaultReducedMotion'".

- [ ] **Step 4: Implement the hook**

```ts
// src/hooks/useVaultReducedMotion.ts
import { useEffect, useState } from 'react';

export interface UseVaultReducedMotionReturn {
  /** True if the user has requested reduced motion at the OS level. */
  reducedMotion: boolean;
  /** True if continuous idle loops should run (reduced-motion off AND tab visible). */
  idleAnimationsAllowed: boolean;
}

const QUERY = '(prefers-reduced-motion: reduce)';

function readReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

function readVisibility(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState !== 'hidden';
}

export function useVaultReducedMotion(): UseVaultReducedMotionReturn {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => readReducedMotion());
  const [visible, setVisible] = useState<boolean>(() => readVisibility());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVis = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return {
    reducedMotion,
    idleAnimationsAllowed: !reducedMotion && visible,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:unit -- tests/useVaultReducedMotion.test.ts`
Expected: 4 PASS.

- [ ] **Step 6: Run full lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add tests/useVaultReducedMotion.test.ts src/hooks/useVaultReducedMotion.ts vitest.config.ts
git commit -m "feat(vault-cinema): useVaultReducedMotion hook with tests"
```

---

### Task 5: `VaultDoorFrame` (marco circular + rims + maker's mark)

Componente puramente visual: el marco con el fondo radial, los dos hairline rims y el maker's mark inferior. Sin animaciones todavía (las añadimos en Task 13).

**Files:**
- Create: `src/components/vault/cinematic/VaultDoorFrame.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/vault/cinematic/VaultDoorFrame.tsx
import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { vaultCinema } from '../../../design-system';

export interface VaultDoorFrameProps {
  children: ReactNode;
  /** Mostrado en la base como firma de joyero. */
  makerMark?: string;
  /** Para tests / overrides. */
  ariaLabel?: string;
}

const { color, alpha } = vaultCinema;

/**
 * Marco circular cinematográfico de la bóveda.
 * Provee fondo radial, dos hairline rims dorados y maker's mark inferior.
 * No incluye dials ni puntero — composer envolvente.
 */
export function VaultDoorFrame({ children, makerMark = 'Tierra Madre', ariaLabel }: VaultDoorFrameProps) {
  return (
    <Box
      role="group"
      aria-label={ariaLabel}
      sx={{
        position: 'relative',
        aspectRatio: '1 / 1',
        width: '100%',
        maxWidth: `min(92vw, ${vaultCinema.layout.wheelBase}px)`,
        borderRadius: '50%',
        background: `radial-gradient(circle at 42% 28%, ${color.nightHint} 0%, ${color.nightShadow} 55%, ${color.ink} 100%)`,
        boxShadow: [
          'inset 0 0 80px rgba(0, 0, 0, 0.95)',
          'inset 0 -40px 60px rgba(0, 0, 0, 0.7)',
          '0 24px 50px rgba(0, 0, 0, 0.85)',
        ].join(', '),
        overflow: 'hidden',
        isolation: 'isolate',
      }}
    >
      {/* Outer hairline rim */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: vaultCinema.layout.outerRingInset,
          borderRadius: '50%',
          border: `${vaultCinema.layout.rimHairlineWidth}px solid rgba(201, 169, 97, ${alpha.rimSoft})`,
          pointerEvents: 'none',
        }}
      />
      {children}
      {makerMark && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: '6%',
            transform: 'translateX(-50%)',
            fontFamily: vaultCinema.typography.family,
            fontSize: vaultCinema.typography.makerMarkSize,
            letterSpacing: vaultCinema.typography.makerMarkLetterSpacing,
            color: `rgba(201, 169, 97, ${alpha.makerMark})`,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            zIndex: 5,
          }}
        >
          {makerMark}
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/vault/cinematic/VaultDoorFrame.tsx
git commit -m "feat(vault-cinema): VaultDoorFrame — circular frame + hairline rim + maker's mark"
```

---

### Task 6: `VaultGemPointer` (puntero superior + gema + heartbeat)

**Files:**
- Create: `src/components/vault/cinematic/VaultGemPointer.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/vault/cinematic/VaultGemPointer.tsx
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { vaultCinema, vaultEasing, vaultDurations } from '../../../design-system';

export interface VaultGemPointerProps {
  /** Desactiva las loop animations (idle breath off). */
  reducedMotion?: boolean;
  /** Pulsa la gema (used by the cinematic sequence Confirm phase). */
  pulse?: boolean;
  /** Override color (used during failure to lerp to coral). */
  gemColor?: string;
}

const { color, layout } = vaultCinema;

/**
 * Puntero hairline superior con gema esmeralda triangular.
 * Heartbeat continuo en idle (scale 1→1.08, box-shadow 8→16px) — desactivado en reduced-motion.
 */
export function VaultGemPointer({
  reducedMotion = false,
  pulse = false,
  gemColor,
}: VaultGemPointerProps) {
  const gemBackground = `linear-gradient(135deg, ${color.emeraldLight} 0%, ${gemColor ?? color.emerald} 60%, ${color.emeraldDeep} 100%)`;

  const animateProps = pulse
    ? { scale: [1, 1.4, 1] }
    : reducedMotion
      ? undefined
      : { scale: [1, 1.08, 1] };

  const transitionProps = pulse
    ? { duration: vaultDurations.confirmMs / 1000, ease: vaultEasing.silk }
    : reducedMotion
      ? undefined
      : {
          duration: vaultDurations.heartbeatMs / 1000,
          ease: vaultEasing.breath,
          repeat: Infinity,
        };

  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: '50%',
        top: '2%',
        transform: 'translateX(-50%)',
        width: layout.pointerWidth,
        height: layout.pointerHeight,
        background: `linear-gradient(180deg, ${color.champagne} 0%, rgba(201, 169, 97, 0.15) 100%)`,
        zIndex: 6,
      }}
    >
      <motion.div
        animate={animateProps}
        transition={transitionProps}
        style={{
          position: 'absolute',
          top: -4,
          left: '50%',
          translateX: '-50%',
          rotate: 45,
          width: pulse ? layout.gemSizePulse : layout.gemSize,
          height: pulse ? layout.gemSizePulse : layout.gemSize,
          background: gemBackground,
          boxShadow: pulse
            ? '0 0 22px rgba(77, 224, 176, 0.95), 0 0 40px rgba(0, 174, 122, 0.6)'
            : '0 0 8px rgba(0, 174, 122, 0.55)',
          border: '0.5px solid rgba(201, 169, 97, 0.5)',
          willChange: pulse || !reducedMotion ? 'transform, box-shadow' : undefined,
        }}
      />
    </Box>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/vault/cinematic/VaultGemPointer.tsx
git commit -m "feat(vault-cinema): VaultGemPointer with idle heartbeat + pulse state"
```

---

### Task 7: `VaultMonumentCenter` (centro tipográfico)

Reemplaza visualmente la caja de `VaultCenter` con tipografía monumental Playfair (símbolo italic + separador hairline + dígito grande). Sin caja de borde.

**Files:**
- Create: `src/components/vault/cinematic/VaultMonumentCenter.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/vault/cinematic/VaultMonumentCenter.tsx
import { Box, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';
import { vaultCinema, vaultEasing, vaultDurations } from '../../../design-system';

export interface VaultMonumentCenterProps {
  symbolName: string;
  digit: number;
  /** Highlight the center as part of the Confirm phase. */
  highlighted?: boolean;
  reducedMotion?: boolean;
  /** Cooldown counter overrides the symbol+digit display. */
  cooldownText?: string;
}

const { color, alpha, typography } = vaultCinema;

/**
 * Centro tipográfico de la bóveda. Sin caja, solo Playfair Display.
 * Puede mostrar (a) símbolo+separador+dígito, o (b) counter de cooldown (mm:ss).
 */
export function VaultMonumentCenter({
  symbolName,
  digit,
  highlighted = false,
  reducedMotion = false,
  cooldownText,
}: VaultMonumentCenterProps) {
  const isLg = useMediaQuery('(min-width: 600px)');
  const numberSize = isLg ? typography.centerNumberSizeLg : typography.centerNumberSize;

  const breathScale = !reducedMotion ? [1, 1.004, 1] : undefined;
  const breathTransition = !reducedMotion
    ? {
        duration: vaultDurations.hubBreathMs / 1000,
        ease: vaultEasing.breath,
        repeat: Infinity,
      }
    : undefined;

  if (cooldownText) {
    return (
      <Box
        aria-live="polite"
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: typography.metaFamily,
          fontSize: 18,
          letterSpacing: '0.15em',
          color: `rgba(201, 169, 97, 0.7)`,
          fontVariantNumeric: 'tabular-nums',
          zIndex: 5,
          textAlign: 'center',
        }}
      >
        {cooldownText}
      </Box>
    );
  }

  return (
    <motion.div
      animate={{ scale: breathScale }}
      transition={breathTransition}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        translateX: '-50%',
        translateY: '-50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        zIndex: 5,
        pointerEvents: 'none',
      }}
    >
      <Box
        component="span"
        sx={{
          fontFamily: typography.family,
          fontStyle: 'italic',
          fontSize: typography.centerSymbolSize,
          letterSpacing: typography.centerSymbolLetterSpacing,
          color: color.emeraldLight,
          textTransform: 'uppercase',
          opacity: highlighted ? 1 : 0.8,
          textShadow: highlighted ? `0 0 8px rgba(0, 174, 122, 0.6)` : 'none',
          transition: `opacity 200ms, text-shadow 200ms`,
        }}
      >
        {symbolName}
      </Box>
      <Box
        aria-hidden
        sx={{
          width: 20,
          height: 1,
          background: `linear-gradient(90deg, transparent, rgba(201, 169, 97, ${alpha.rimStrong}), transparent)`,
        }}
      />
      <Box
        component="span"
        sx={{
          fontFamily: typography.family,
          fontSize: numberSize,
          color: color.champagneBright,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 0.9,
          letterSpacing: '-0.02em',
          textShadow: highlighted ? '0 0 12px rgba(223, 195, 131, 0.6)' : 'none',
          transition: 'text-shadow 200ms',
        }}
      >
        {String(digit).padStart(2, '0')}
      </Box>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/vault/cinematic/VaultMonumentCenter.tsx
git commit -m "feat(vault-cinema): VaultMonumentCenter with hub breath + cooldown view"
```

---

### Task 8: `VaultCardinalRelease` (4 hairlines + micro-esmeraldas en stagger)

Animación de la fase Release (400–900 ms): 4 líneas hairline doradas se expanden desde el centro hacia los puntos cardinales N→E→S→W con stagger de 40 ms; al llegar emerge una micro-esmeralda con spring overshoot.

**Files:**
- Create: `src/components/vault/cinematic/VaultCardinalRelease.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/vault/cinematic/VaultCardinalRelease.tsx
import { Box } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { vaultCinema, vaultEasing, vaultDurations } from '../../../design-system';

export interface VaultCardinalReleaseProps {
  /** When true, plays the release sequence once. */
  active: boolean;
  reducedMotion?: boolean;
}

const { color, layout } = vaultCinema;

const CARDINALS: Array<{ dir: 'n' | 'e' | 's' | 'w'; deg: number; pos: Record<string, string | number> }> = [
  { dir: 'n', deg: 270, pos: { top: '3%', left: '50%', transform: 'translateX(-50%)' } },
  { dir: 'e', deg: 0, pos: { right: '3%', top: '50%', transform: 'translateY(-50%)' } },
  { dir: 's', deg: 90, pos: { bottom: '3%', left: '50%', transform: 'translateX(-50%)' } },
  { dir: 'w', deg: 180, pos: { left: '3%', top: '50%', transform: 'translateY(-50%)' } },
];

/**
 * 4 hairlines doradas que emergen desde el centro hacia los 4 puntos cardinales en stagger N→E→S→W.
 * Al final de cada línea aparece una micro-esmeralda con spring overshoot.
 * En reduced-motion las 4 gemas aparecen simultáneas con fade simple.
 */
export function VaultCardinalRelease({ active, reducedMotion = false }: VaultCardinalReleaseProps) {
  if (!active) return null;

  const lineDur = reducedMotion ? 0 : vaultDurations.releaseMs / 1000 / 2; // 250 ms
  const gemDur = reducedMotion ? vaultDurations.reducedReleaseMs / 1000 : 0.26;

  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
      <AnimatePresence>
        {CARDINALS.map((c, i) => {
          const lineDelay = reducedMotion ? 0 : (i * vaultDurations.releaseStaggerMs) / 1000;
          const gemDelay = reducedMotion ? 0 : lineDelay + lineDur * 0.7;

          return (
            <Box key={c.dir}>
              {/* Hairline (skip in reduced-motion) */}
              {!reducedMotion && (
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{
                    duration: lineDur,
                    delay: lineDelay,
                    ease: vaultEasing.silk,
                  }}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    height: 1,
                    width: '46%',
                    background: `linear-gradient(90deg, rgba(201, 169, 97, 0.8) 0%, rgba(201, 169, 97, 0.4) 80%, transparent 100%)`,
                    transformOrigin: '0 50%',
                    transform: `translateY(-50%) rotate(${c.deg}deg)`,
                    boxShadow: '0 0 4px rgba(201, 169, 97, 0.5)',
                  }}
                />
              )}
              {/* Cardinal gem */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: reducedMotion ? 1 : [0, 1.3, 1], opacity: 1 }}
                transition={{
                  duration: gemDur,
                  delay: gemDelay,
                  ease: vaultEasing.silk,
                }}
                style={{
                  position: 'absolute',
                  width: layout.cardinalGemSize,
                  height: layout.cardinalGemSize,
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 30% 30%, ${color.emeraldLight}, ${color.emerald} 65%, ${color.emeraldDeep})`,
                  boxShadow: '0 0 8px rgba(0, 174, 122, 0.7)',
                  ...c.pos,
                }}
              />
            </Box>
          );
        })}
      </AnimatePresence>
    </Box>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/vault/cinematic/VaultCardinalRelease.tsx
git commit -m "feat(vault-cinema): VaultCardinalRelease — 4 hairlines + cardinal gems with stagger"
```

---

### Task 9: `VaultInterior` (reveal ámbar + camera dolly)

**Files:**
- Create: `src/components/vault/cinematic/VaultInterior.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/vault/cinematic/VaultInterior.tsx
import { Box } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { vaultCinema, vaultEasing, vaultDurations } from '../../../design-system';

export interface VaultInteriorProps {
  /** Active during Reveal+Dolly phases. */
  active: boolean;
  reducedMotion?: boolean;
}

const { color } = vaultCinema;

/**
 * Reveal del interior cálido tras la puerta + camera dolly final.
 * En reduced-motion: cross-fade simple sin scale.
 */
export function VaultInterior({ active, reducedMotion = false }: VaultInteriorProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.85 }}
          animate={{ opacity: 1, scale: reducedMotion ? 1 : 1.08 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: reducedMotion
              ? vaultDurations.reducedRevealMs / 1000
              : vaultDurations.revealMs / 1000,
            ease: vaultEasing.silk,
          }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 50%, ${color.interiorWarm} 0%, ${color.interiorMid} 40%, ${color.interiorDark} 100%)`,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        />
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/vault/cinematic/VaultInterior.tsx
git commit -m "feat(vault-cinema): VaultInterior — warm amber reveal + scale dolly"
```

---

### Task 10: Refactor `VaultDialLabel` para orientación vertical fija + opacity prop

`VaultDialLabel` actualmente contrarrota el label para mantenerlo horizontal mientras el ring rota. Eso queda OK. Pero ahora también acepta una `opacity` (calculada externamente por el foco suave) y deja de usar `gap: 2` agresivo (centro flexible).

**Files:**
- Modify: `src/components/vault/VaultDialLabel.tsx`

- [ ] **Step 1: Replace the file with the updated version**

```tsx
// src/components/vault/VaultDialLabel.tsx
import { motion, useTransform, type MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';

interface VaultDialLabelProps {
  children: ReactNode;
  index: number;
  totalItems: number;
  radius: number;
  ringRotate: MotionValue<number>;
  width?: number;
  /** Opacidad del label (foco suave: 1 active, 0.6 vecinos, 0.28 resto). */
  opacity?: number;
}

/**
 * Posiciona el label en un punto del círculo y lo contrarrota con el spring del anillo
 * para que siempre quede horizontal al lector. Acepta opacity para implementar el foco suave.
 */
export function VaultDialLabel({
  children,
  index,
  totalItems,
  radius,
  ringRotate,
  width = 64,
  opacity = 1,
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
          opacity,
          transition: 'opacity 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/vault/VaultDialLabel.tsx
git commit -m "feat(vault-cinema): add opacity prop to VaultDialLabel for soft focus"
```

---

### Task 11: Extender `VaultDial` con `focusMode`

Cuando `focusMode === true`, el dial calcula la opacidad de cada label según su distancia al activo (active 1.0, vecinos directos 0.6, resto 0.28) y la pasa al render prop como tercer argumento.

**Files:**
- Modify: `src/components/vault/VaultDial.tsx`

- [ ] **Step 1: Open `src/components/vault/VaultDial.tsx` and update the props + render loop**

Find the `VaultDialProps` interface and add:

```ts
  /** Si true, opacidad escalonada según distancia al activo (foco suave cinematográfico). */
  focusMode?: boolean;
  /** Render prop receives item, index, ringRotate, AND opacity (when focusMode is on). */
  renderLabel: (
    item: VaultDialItem,
    index: number,
    ringRotate: MotionValue<number>,
    opacity: number,
  ) => ReactNode;
```

Then update the destructuring and the render call. Replace the function signature and the `items.map(...)` line:

```tsx
export function VaultDial({
  items,
  value,
  onChange,
  size,
  radius: _radius,
  disabled = false,
  ariaLabel,
  renderLabel,
  focusMode = false,
}: VaultDialProps) {
  // ... existing body unchanged ...

  // Helper: distance in steps to active
  const distanceTo = (i: number): number => {
    const total = items.length;
    const raw = Math.abs(i - value);
    return Math.min(raw, total - raw);
  };

  // Helper: opacity per label
  const opacityFor = (i: number): number => {
    if (!focusMode) return 1;
    const d = distanceTo(i);
    if (d === 0) return 1;
    if (d === 1) return 0.6;
    return 0.28;
  };

  // ... existing return ...
  return (
    <motion.div
      // ... existing motion.div props ...
    >
      {items.map((item, i) => renderLabel(item, i, spring, opacityFor(i)))}
    </motion.div>
  );
}
```

- [ ] **Step 2: Run lint to surface call-site mismatches**

Run: `npm run lint`
Expected: errors at `VaultLockScreen.tsx` because it passes a 3-arg renderLabel — this is expected; we'll update the lockscreen in a later task. **Allow these errors for now** (they will be fixed in Task 16).

If `VaultDial.tsx` itself fails typecheck, fix it before moving on. Other call sites (only `VaultLockScreen.tsx`) failing is acceptable.

- [ ] **Step 3: Commit**

```bash
git add src/components/vault/VaultDial.tsx
git commit -m "feat(vault-cinema): VaultDial focusMode prop computes per-label opacity

VaultLockScreen will be updated in a follow-up task; expect transient
typecheck errors there until then."
```

---

### Task 12: `useVaultCinematicSequence` (state machine) — TDD

Hook que recibe el `state` de `useVaultUnlock` y emite la `phase` cinematográfica con stagger preciso. Es lógica pura sobre timers — TDD aplicable.

**Files:**
- Create: `tests/vault-cinematic-sequence.test.ts`
- Create: `src/components/vault/cinematic/useVaultCinematicSequence.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/vault-cinematic-sequence.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/vault-cinematic-sequence.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement the hook**

```ts
// src/components/vault/cinematic/useVaultCinematicSequence.ts
import { useEffect, useRef, useState } from 'react';
import { vaultDurations } from '../../../design-system';
import type { VaultState } from '../../../types/vault';

export type CinematicPhase =
  | 'idle'
  | 'anticipate'
  | 'confirm'
  | 'release'
  | 'swing'
  | 'reveal'
  | 'dolly'
  | 'failure'
  | 'cooldown';

export interface UseVaultCinematicSequenceOptions {
  state: VaultState | 'unlocked';
  reducedMotion: boolean;
  /** Called once when the visual sequence is "ready to hand over" (200 ms before container fades out). */
  onSequenceComplete: () => void;
}

export interface UseVaultCinematicSequenceReturn {
  phase: CinematicPhase;
}

/**
 * Drives the cinematic phases of the vault unlock sequence.
 * Listens to the upstream VaultState and schedules timed transitions.
 */
export function useVaultCinematicSequence({
  state,
  reducedMotion,
  onSequenceComplete,
}: UseVaultCinematicSequenceOptions): UseVaultCinematicSequenceReturn {
  const [phase, setPhase] = useState<CinematicPhase>('idle');
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const completedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    completedRef.current = false;

    if (state === 'idle') {
      setPhase('idle');
      return;
    }

    if (state === 'cooldown') {
      setPhase('cooldown');
      return;
    }

    if (state === 'error') {
      setPhase('failure');
      return;
    }

    if (state === 'unlocking' || state === 'unlocked') {
      runSuccessSequence(reducedMotion);
    }

    function clearTimersInner() {
      clearTimers();
    }
  }, [state, reducedMotion]);

  function clearTimers() {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }

  function schedule(at: number, fn: () => void) {
    const t = setTimeout(fn, at);
    timers.current.push(t);
  }

  function fireCompleteOnce() {
    if (completedRef.current) return;
    completedRef.current = true;
    onSequenceComplete();
  }

  function runSuccessSequence(reduced: boolean) {
    if (reduced) {
      // Skip anticipate; collapse to: confirm → release → swing → reveal
      setPhase('confirm');
      schedule(vaultDurations.reducedConfirmMs, () => setPhase('release'));
      schedule(
        vaultDurations.reducedConfirmMs + vaultDurations.reducedReleaseMs,
        () => setPhase('swing'),
      );
      schedule(
        vaultDurations.reducedConfirmMs +
          vaultDurations.reducedReleaseMs +
          vaultDurations.reducedSwingMs,
        () => setPhase('reveal'),
      );
      schedule(vaultDurations.reducedMotionTotalMs, fireCompleteOnce);
      return;
    }

    setPhase('anticipate');
    schedule(vaultDurations.anticipateMs, () => setPhase('confirm'));
    schedule(vaultDurations.anticipateMs + vaultDurations.confirmMs, () =>
      setPhase('release'),
    );
    schedule(
      vaultDurations.anticipateMs + vaultDurations.confirmMs + vaultDurations.releaseMs,
      () => setPhase('swing'),
    );
    schedule(
      vaultDurations.anticipateMs +
        vaultDurations.confirmMs +
        vaultDurations.releaseMs +
        vaultDurations.swingMs,
      () => setPhase('reveal'),
    );
    schedule(
      vaultDurations.anticipateMs +
        vaultDurations.confirmMs +
        vaultDurations.releaseMs +
        vaultDurations.swingMs +
        vaultDurations.revealMs,
      () => setPhase('dolly'),
    );
    schedule(vaultDurations.unlockCallbackOffsetMs, fireCompleteOnce);
  }

  return { phase };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- tests/vault-cinematic-sequence.test.ts`
Expected: 4 PASS.

- [ ] **Step 5: Run full lint**

Run: `npm run lint`
Expected: PASS (vault tests area).

- [ ] **Step 6: Commit**

```bash
git add tests/vault-cinematic-sequence.test.ts src/components/vault/cinematic/useVaultCinematicSequence.ts
git commit -m "feat(vault-cinema): useVaultCinematicSequence orchestrator with tests"
```

---

### Task 13: Audio samples registry

Define qué samples existen y dónde viven. Los archivos físicos los provee el diseñador sonoro — el sistema funciona sin ellos (graceful skip).

**Files:**
- Create: `src/components/vault/audio/samples.ts`

- [ ] **Step 1: Create the file**

```ts
// src/components/vault/audio/samples.ts
/**
 * Vault audio samples registry. Files live under public/audio/vault/.
 * Volúmenes definidos en el spec (sec 7). Si un archivo no existe,
 * useVaultAudio lo registra como missing y el sample queda mute (no error).
 */

export type VaultSampleId =
  | 'click-suizo'
  | 'thunk-mecanico'
  | 'crujido-swing'
  | 'pad-reveal'
  | 'shake-error';

export interface VaultSampleMeta {
  id: VaultSampleId;
  src: string;
  volume: number;
}

export const VAULT_SAMPLES: readonly VaultSampleMeta[] = [
  { id: 'click-suizo',     src: '/audio/vault/click-suizo.mp3',     volume: 0.35 },
  { id: 'thunk-mecanico',  src: '/audio/vault/thunk-mecanico.mp3',  volume: 0.40 },
  { id: 'crujido-swing',   src: '/audio/vault/crujido-swing.mp3',   volume: 0.45 },
  { id: 'pad-reveal',      src: '/audio/vault/pad-reveal.mp3',      volume: 0.30 },
  { id: 'shake-error',     src: '/audio/vault/shake-error.mp3',     volume: 0.35 },
] as const;

export const VAULT_AUDIO_STORAGE_KEY = 'tm:vault:audio';
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/vault/audio/samples.ts
git commit -m "feat(vault-cinema): vault audio sample registry"
```

---

### Task 14: `useVaultAudio` hook (TDD)

Hook que: (a) lee toggle persistente de localStorage, (b) lazy crea AudioContext en el primer play attempt, (c) carga buffers on-demand y los cachea, (d) hace skip silencioso si el fetch falla.

**Files:**
- Create: `tests/vault-audio.test.ts`
- Create: `src/components/vault/audio/useVaultAudio.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/vault-audio.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVaultAudio } from '../src/components/vault/audio/useVaultAudio';
import { VAULT_AUDIO_STORAGE_KEY } from '../src/components/vault/audio/samples';

describe('useVaultAudio', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts disabled when localStorage is empty', () => {
    const { result } = renderHook(() => useVaultAudio());
    expect(result.current.enabled).toBe(false);
  });

  it('reads "on" from localStorage on mount', () => {
    localStorage.setItem(VAULT_AUDIO_STORAGE_KEY, 'on');
    const { result } = renderHook(() => useVaultAudio());
    expect(result.current.enabled).toBe(true);
  });

  it('toggle persists state to localStorage', () => {
    const { result } = renderHook(() => useVaultAudio());
    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(true);
    expect(localStorage.getItem(VAULT_AUDIO_STORAGE_KEY)).toBe('on');
    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(false);
    expect(localStorage.getItem(VAULT_AUDIO_STORAGE_KEY)).toBe('off');
  });

  it('play is a no-op when audio is disabled', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const { result } = renderHook(() => useVaultAudio());
    await act(async () => {
      await result.current.play('click-suizo');
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('play swallows fetch failures silently', async () => {
    localStorage.setItem(VAULT_AUDIO_STORAGE_KEY, 'on');
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useVaultAudio());
    let threw = false;
    await act(async () => {
      try {
        await result.current.play('click-suizo');
      } catch {
        threw = true;
      }
    });
    expect(threw).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/vault-audio.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement the hook**

```ts
// src/components/vault/audio/useVaultAudio.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { VAULT_AUDIO_STORAGE_KEY, VAULT_SAMPLES, type VaultSampleId } from './samples';

export interface UseVaultAudioReturn {
  enabled: boolean;
  toggle: () => void;
  play: (id: VaultSampleId) => Promise<void>;
}

const SAMPLE_BY_ID = new Map(VAULT_SAMPLES.map((s) => [s.id, s] as const));

function readEnabled(): boolean {
  try {
    return localStorage.getItem(VAULT_AUDIO_STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

function writeEnabled(v: boolean): void {
  try {
    localStorage.setItem(VAULT_AUDIO_STORAGE_KEY, v ? 'on' : 'off');
  } catch {
    /* no-op */
  }
}

type AudioCtxCtor = typeof AudioContext;

function getAudioContextCtor(): AudioCtxCtor | null {
  if (typeof window === 'undefined') return null;
  return (
    (window.AudioContext as AudioCtxCtor | undefined) ??
    ((window as unknown as { webkitAudioContext?: AudioCtxCtor }).webkitAudioContext ?? null)
  );
}

export function useVaultAudio(): UseVaultAudioReturn {
  const [enabled, setEnabled] = useState<boolean>(() => readEnabled());
  const ctxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Map<VaultSampleId, AudioBuffer | 'missing'>>(new Map());

  // Cleanup on unmount
  useEffect(
    () => () => {
      ctxRef.current?.close().catch(() => {});
    },
    [],
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      writeEnabled(next);
      return next;
    });
  }, []);

  const ensureCtx = useCallback((): AudioContext | null => {
    if (ctxRef.current) return ctxRef.current;
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;
    try {
      ctxRef.current = new Ctor();
    } catch {
      return null;
    }
    return ctxRef.current;
  }, []);

  const loadBuffer = useCallback(
    async (meta: { src: string; id: VaultSampleId }): Promise<AudioBuffer | null> => {
      const cached = buffersRef.current.get(meta.id);
      if (cached === 'missing') return null;
      if (cached) return cached;

      const ctx = ensureCtx();
      if (!ctx) {
        buffersRef.current.set(meta.id, 'missing');
        return null;
      }

      try {
        const res = await fetch(meta.src);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        buffersRef.current.set(meta.id, buf);
        return buf;
      } catch {
        buffersRef.current.set(meta.id, 'missing');
        return null;
      }
    },
    [ensureCtx],
  );

  const play = useCallback(
    async (id: VaultSampleId): Promise<void> => {
      if (!enabled) return;
      const meta = SAMPLE_BY_ID.get(id);
      if (!meta) return;

      const buf = await loadBuffer(meta);
      const ctx = ctxRef.current;
      if (!buf || !ctx) return;

      try {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.value = meta.volume;
        src.connect(gain).connect(ctx.destination);
        src.start();
      } catch {
        /* swallow — never crash the unlock sequence due to audio */
      }
    },
    [enabled, loadBuffer],
  );

  return { enabled, toggle, play };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- tests/vault-audio.test.ts`
Expected: 5 PASS.

- [ ] **Step 5: Run full lint**

Run: `npm run lint`
Expected: PASS (vault tests area).

- [ ] **Step 6: Commit**

```bash
git add tests/vault-audio.test.ts src/components/vault/audio/useVaultAudio.ts
git commit -m "feat(vault-cinema): useVaultAudio hook with persistence + lazy load"
```

---

### Task 15: Deprecation shims en `config/vault.ts`

Mantener `vaultPalette` como `@deprecated` shim que reexporta los colores nuevos (sin romper consumidores existentes).

**Files:**
- Modify: `src/config/vault.ts`

- [ ] **Step 1: Add deprecation comment to existing `vaultPalette` declaration**

Replace the `vaultPalette` const block (lines 47–58) with:

```ts
import { vaultCinema } from '../design-system';

/**
 * @deprecated Use `vaultCinema` from `@/design-system` instead.
 * Preserved as a shim for legacy consumers (VaultCenter, VaultSymbol, etc.).
 * Will be removed in a future minor release.
 */
export const vaultPalette = {
  bg: vaultCinema.color.nightDeep,
  bgOverlay: 'rgba(0, 0, 0, 0.82)',
  steel: '#2E2823',
  steelLight: '#5C5148',
  gold: vaultCinema.color.champagne,
  goldGlow: 'rgba(212, 175, 55, 0.55)',
  emerald: vaultCinema.color.emerald,
  error: vaultCinema.color.coral,
  textMuted: 'rgba(255, 255, 255, 0.55)',
  textOnGold: vaultCinema.color.nightDeep,
} as const;
```

(Make sure the existing `import { emeraldCore, goldAccent, goldAlpha } from '../design-system';` stays at the top — adding the new `vaultCinema` import to it is fine: `import { emeraldCore, goldAccent, goldAlpha, vaultCinema } from '../design-system';`.)

- [ ] **Step 2: Verify typecheck**

Run: `npm run lint`
Expected: PASS (config-side; the LockScreen errors from Task 11 still pending).

- [ ] **Step 3: Commit**

```bash
git add src/config/vault.ts
git commit -m "refactor(vault-cinema): mark vaultPalette as deprecated shim"
```

---

### Task 16: Refactor `VaultLockScreen` (integración)

Sustituye el árbol de render por composición de los componentes cinematográficos. Mantiene la API pública (`VaultLockScreenProps` sin cambios), `useVaultUnlock` igual, y los keyboard handlers de los dials.

**Files:**
- Modify: `src/components/vault/VaultLockScreen.tsx`

- [ ] **Step 1: Replace `VaultLockScreen.tsx` with the new implementation**

```tsx
// src/components/vault/VaultLockScreen.tsx
import { Box, Button } from '@mui/material';
import { motion, type MotionValue } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Volume2, VolumeX } from 'lucide-react';
import { vaultCinema, vaultDurations, vaultEasing } from '../../design-system';
import { VAULT_CONFIG, VAULT_STORAGE, VAULT_SYMBOLS } from '../../config/vault';
import { useVaultUnlock } from '../../hooks/useVaultUnlock';
import { useVaultReducedMotion } from '../../hooks/useVaultReducedMotion';
import type { UnlockMethod, VaultCombination } from '../../types/vault';
import { VaultDial, type VaultDialItem } from './VaultDial';
import { VaultDialLabel } from './VaultDialLabel';
import { VaultDoorFrame } from './cinematic/VaultDoorFrame';
import { VaultGemPointer } from './cinematic/VaultGemPointer';
import { VaultMonumentCenter } from './cinematic/VaultMonumentCenter';
import { VaultCardinalRelease } from './cinematic/VaultCardinalRelease';
import { VaultInterior } from './cinematic/VaultInterior';
import { useVaultCinematicSequence } from './cinematic/useVaultCinematicSequence';
import { useVaultAudio } from './audio/useVaultAudio';

export interface VaultLockScreenProps {
  onUnlock: (meta: UnlockMethod) => void;
  ambassadorCodes?: Map<string, VaultCombination>;
}

const { color, alpha, typography } = vaultCinema;

export function VaultLockScreen({ onUnlock, ambassadorCodes }: VaultLockScreenProps) {
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

  const { reducedMotion } = useVaultReducedMotion();
  const audio = useVaultAudio();
  const wheelRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerOpacity, setContainerOpacity] = useState(1);
  const lastUnlockAttempt = useRef<number>(0);

  const outerSymbol = VAULT_SYMBOLS[outerIdx];

  const sequence = useVaultCinematicSequence({
    state,
    reducedMotion,
    onSequenceComplete: useCallback(() => {
      setContainerOpacity(0);
      const raw = (() => {
        try {
          return localStorage.getItem(VAULT_STORAGE.UNLOCK_METHOD);
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
    }, [onUnlock]),
  });

  // Trigger audio per phase
  useEffect(() => {
    if (sequence.phase === 'confirm') void audio.play('click-suizo');
    if (sequence.phase === 'release') void audio.play('thunk-mecanico');
    if (sequence.phase === 'swing') void audio.play('crujido-swing');
    if (sequence.phase === 'reveal') void audio.play('pad-reveal');
    if (sequence.phase === 'failure') void audio.play('shake-error');
  }, [sequence.phase, audio]);

  // Responsive scale (keep existing behaviour from previous version)
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / VAULT_CONFIG.WHEEL_BASE));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const outerItems: VaultDialItem[] = useMemo(
    () => VAULT_SYMBOLS.map((s) => ({ id: s.id, label: s.name, color: s.color })),
    [],
  );
  const innerItems: VaultDialItem[] = useMemo(
    () => Array.from({ length: VAULT_CONFIG.INNER_STEPS }, (_, i) => ({ id: String(i), label: i })),
    [],
  );

  // Render labels: vertical Playfair, opacity from focusMode
  const renderOuterLabel = useCallback(
    (item: VaultDialItem, i: number, ringRotate: MotionValue<number>, opacity: number) => (
      <VaultDialLabel
        key={item.id}
        index={i}
        totalItems={VAULT_CONFIG.OUTER_STEPS}
        radius={VAULT_CONFIG.OUTER_RADIUS}
        ringRotate={ringRotate}
        width={72}
        opacity={opacity}
      >
        <Box
          component="span"
          sx={{
            fontFamily: typography.family,
            fontStyle: 'italic',
            fontSize:
              opacity === 1
                ? typography.dialSymbolSizeActive
                : typography.dialSymbolSize,
            color:
              opacity === 1
                ? color.emeraldLight
                : `rgba(201, 169, 97, ${alpha.rimMedium})`,
            textAlign: 'center',
            textShadow:
              opacity === 1
                ? '0 0 8px rgba(0, 174, 122, 0.5)'
                : 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {VAULT_SYMBOLS[i].name}
        </Box>
      </VaultDialLabel>
    ),
    [],
  );

  const renderInnerLabel = useCallback(
    (item: VaultDialItem, i: number, ringRotate: MotionValue<number>, opacity: number) => (
      <VaultDialLabel
        key={item.id}
        index={i}
        totalItems={VAULT_CONFIG.INNER_STEPS}
        radius={VAULT_CONFIG.INNER_RADIUS}
        ringRotate={ringRotate}
        width={40}
        opacity={opacity}
      >
        <Box
          component="span"
          sx={{
            fontFamily: typography.family,
            fontSize:
              opacity === 1
                ? typography.dialDigitSizeActive
                : typography.dialDigitSize,
            fontWeight: opacity === 1 ? 500 : 400,
            color: opacity === 1 ? color.champagneBright : color.champagne,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {i}
        </Box>
      </VaultDialLabel>
    ),
    [],
  );

  const isInteractive =
    state === 'idle' && sequence.phase === 'idle';
  const isCooldown = state === 'cooldown';

  const onConfirmClick = useCallback(() => {
    const now = Date.now();
    if (now - lastUnlockAttempt.current < vaultDurations.unlockDebounceMs) return;
    lastUnlockAttempt.current = now;
    if (!isInteractive) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        /* no-op */
      }
    }
    tryUnlock();
  }, [tryUnlock, isInteractive]);

  const isFailure = sequence.phase === 'failure';
  const isUnlocking = ['anticipate', 'confirm', 'release', 'swing', 'reveal', 'dolly'].includes(
    sequence.phase,
  );
  const isCenterHighlighted = ['confirm', 'release'].includes(sequence.phase);
  const isCardinalActive = ['release', 'swing', 'reveal', 'dolly'].includes(sequence.phase);
  const isInteriorActive = ['reveal', 'dolly'].includes(sequence.phase);
  const isPointerPulsing = sequence.phase === 'confirm';

  return (
    <motion.div
      animate={{ opacity: containerOpacity, scale: containerOpacity === 0 ? 1.06 : 1 }}
      transition={{
        duration: vaultDurations.dollyMs / 1000,
        ease: vaultEasing.silk,
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: color.ink,
      }}
    >
      <Box
        // @ts-expect-error - inert is a valid HTML attribute (React 18 supports it via spread)
        inert={isUnlocking ? '' : undefined}
        aria-hidden={isUnlocking ? true : undefined}
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 2.5,
          width: '100%',
          maxWidth: 480,
          paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Box
          component="h1"
          sx={{
            fontFamily: typography.family,
            fontSize: '2.25rem',
            fontWeight: 400,
            color: color.champagneBright,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Bóveda Secreta
        </Box>
        <Box
          component="p"
          sx={{
            fontSize: '0.7rem',
            color: `rgba(201, 169, 97, 0.55)`,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            fontFamily: typography.metaFamily,
          }}
        >
          Gira las ruedas y abre
        </Box>

        {/* Cinematic door frame */}
        <Box
          ref={wheelRef}
          sx={{
            position: 'relative',
            aspectRatio: '1 / 1',
            width: '100%',
            maxWidth: `min(92vw, ${VAULT_CONFIG.WHEEL_BASE}px)`,
            mt: 1.5,
          }}
        >
          <VaultDoorFrame
            ariaLabel={`Combinación: ${outerSymbol.name}, ${innerIdx}`}
            makerMark={isFailure ? `${attemptsLeft} intentos restantes` : 'Tierra Madre · Esencia y Poder'}
          >
            {/* Dials */}
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
                disabled={!isInteractive}
                ariaLabel="Anillo exterior: símbolo"
                renderLabel={renderOuterLabel}
                focusMode
              />
              <VaultDial
                items={innerItems}
                value={innerIdx}
                onChange={setInnerIdx}
                size={VAULT_CONFIG.INNER_SIZE}
                radius={VAULT_CONFIG.INNER_RADIUS}
                disabled={!isInteractive}
                ariaLabel="Anillo interior: dígito"
                renderLabel={renderInnerLabel}
                focusMode
              />
            </Box>

            {/* Center display */}
            <VaultMonumentCenter
              symbolName={outerSymbol.name}
              digit={innerIdx}
              highlighted={isCenterHighlighted}
              reducedMotion={reducedMotion}
              cooldownText={
                isCooldown ? formatCooldown(cooldownSecondsLeft) : undefined
              }
            />

            {/* Cardinal release */}
            <VaultCardinalRelease active={isCardinalActive} reducedMotion={reducedMotion} />

            {/* Interior reveal */}
            <VaultInterior active={isInteriorActive} reducedMotion={reducedMotion} />

            {/* Top pointer + gem */}
            <VaultGemPointer
              reducedMotion={reducedMotion}
              pulse={isPointerPulsing}
              gemColor={isFailure ? color.coral : undefined}
            />
          </VaultDoorFrame>
        </Box>

        {/* Status line */}
        <Box
          aria-live={isFailure ? 'polite' : 'off'}
          sx={{
            height: 20,
            mt: 0.5,
            fontSize: '0.75rem',
            color: color.coral,
            textAlign: 'center',
          }}
        >
          {isFailure &&
            (attemptsLeft > 0
              ? `Combinación incorrecta. ${attemptsLeft} intento${attemptsLeft === 1 ? '' : 's'} restante${attemptsLeft === 1 ? '' : 's'}.`
              : 'Demasiados intentos. Bóveda bloqueada.')}
        </Box>

        {/* Confirm button */}
        <Button
          onClick={onConfirmClick}
          disabled={!isInteractive}
          aria-label="Confirmar combinación"
          sx={{
            minWidth: 130,
            height: 46,
            borderRadius: '14px',
            fontFamily: typography.metaFamily,
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: color.champagneBright,
            background: 'transparent',
            border: `1px solid rgba(201, 169, 97, ${alpha.rimMedium})`,
            transition: 'all 200ms cubic-bezier(0.22, 1, 0.36, 1)',
            mt: 1,
            '&:hover': {
              background: `rgba(201, 169, 97, 0.08)`,
              borderColor: `rgba(201, 169, 97, 0.5)`,
            },
            '&:disabled': {
              color: `rgba(201, 169, 97, 0.4)`,
              borderColor: `rgba(201, 169, 97, 0.15)`,
            },
          }}
        >
          {isUnlocking ? <Lock size={16} color={color.champagne} /> : 'Abrir'}
        </Button>

        {/* Audio toggle */}
        <Button
          onClick={audio.toggle}
          aria-label={audio.enabled ? 'Silenciar audio' : 'Activar audio'}
          sx={{
            minWidth: 0,
            width: 36,
            height: 36,
            mt: 0.5,
            borderRadius: '50%',
            color: `rgba(201, 169, 97, 0.5)`,
            '&:hover': { background: 'rgba(201, 169, 97, 0.08)' },
          }}
        >
          {audio.enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </Button>
      </Box>
    </motion.div>
  );
}

function formatCooldown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run lint`
Expected: PASS (the prior transient errors from Task 11 are now resolved).

- [ ] **Step 3: Run all unit tests**

Run: `npm run test:unit`
Expected: All previously-passing tests still pass; the 3 new vault tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/vault/VaultLockScreen.tsx
git commit -m "feat(vault-cinema): integrate cinematic components into VaultLockScreen

Replaces the legacy render tree with composition of VaultDoorFrame,
VaultMonumentCenter, VaultGemPointer, VaultCardinalRelease and
VaultInterior, orchestrated by useVaultCinematicSequence. Audio toggle
included; OFF by default. useVaultUnlock and storage keys unchanged."
```

---

### Task 17: Marcar `VaultCenter` como deprecated shim

`VaultCenter` ya no se usa por `VaultLockScreen`, pero podría tener consumidores externos. Lo dejamos como shim que delega al nuevo `VaultMonumentCenter`.

**Files:**
- Modify: `src/components/vault/VaultCenter.tsx`

- [ ] **Step 1: Replace `VaultCenter.tsx` content with shim**

```tsx
// src/components/vault/VaultCenter.tsx
import type { VaultState, VaultSymbolMeta } from '../../types/vault';
import { VaultMonumentCenter } from './cinematic/VaultMonumentCenter';

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

/**
 * @deprecated Use `VaultMonumentCenter` directly. This file will be removed
 * once external consumers migrate. Maintained as a thin compatibility wrapper.
 */
export function VaultCenter({
  outerSymbol,
  innerDigit,
  state,
  cooldownSecondsLeft = 0,
}: VaultCenterProps) {
  const isCooldown = state === 'cooldown';
  return (
    <VaultMonumentCenter
      symbolName={outerSymbol.name}
      digit={innerDigit}
      highlighted={state === 'unlocking'}
      cooldownText={isCooldown ? formatCooldown(cooldownSecondsLeft) : undefined}
    />
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/vault/VaultCenter.tsx
git commit -m "refactor(vault-cinema): VaultCenter delegates to VaultMonumentCenter (deprecated shim)"
```

---

### Task 18: Manual verification — golden path + accessibility

**Files:** none (manual checklist)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: Vite dev server starts on `localhost:3000` with no console errors.

- [ ] **Step 2: Navigate to `/vault` and walk the golden path**

Open `http://localhost:3000/vault` in Chrome (latest). Verify:

- [ ] Idle state: Bóveda Secreta title, two concentric rings render with hairline gold borders
- [ ] Idle state: gem at top has visible heartbeat (subtle pulse every ~2.8s)
- [ ] Idle state: center shows "Esmeralda · 07" placeholder until you rotate
- [ ] Drag the inner ring → digits rotate, only the active digit at the top is bright (others dimmed via focusMode)
- [ ] Drag the outer ring → symbol names rotate, only active brightened
- [ ] Center text updates as you change rings
- [ ] Click "Abrir" with combination "Esmeralda · 7" → 5-phase cinematic sequence plays in ~2.4s, ending with crossfade to next view
- [ ] No console errors during the unlock animation

- [ ] **Step 3: Verify failure flow**

Reload the page. Set inner digit to 5 (not 7). Click "Abrir":

- [ ] Both rings shake with differential timing (outer slightly delayed)
- [ ] Gem briefly turns coral, then back to emerald
- [ ] Status text: "Combinación incorrecta. 2 intentos restantes."
- [ ] Click "Abrir" again with wrong combo → "1 intento restante"
- [ ] Third wrong attempt → status: "Demasiados intentos." Counter starts in center (mm:ss).

- [ ] **Step 4: Verify reduced-motion mode**

In macOS: System Settings → Accessibility → Display → Reduce Motion ON. Reload `/vault`:

- [ ] No idle heartbeat on the gem
- [ ] Hub center is static (no breath)
- [ ] Unlock sequence: ~1.1s total, no rotateY, no scale on interior — just cross-fades

Turn Reduce Motion OFF for next steps.

- [ ] **Step 5: Verify audio toggle**

Click the speaker icon below "Abrir":

- [ ] Icon changes from VolumeX to Volume2
- [ ] localStorage now has `tm:vault:audio = "on"`
- [ ] Trigger an unlock — if `public/audio/vault/*.mp3` files exist, sounds play; if not, no errors are thrown
- [ ] Click again to toggle off

- [ ] **Step 6: Verify keyboard navigation**

Tab through the page:

- [ ] Focus reaches the outer dial → ArrowUp/Down rotates it
- [ ] Tab to inner dial → ArrowUp/Down rotates it
- [ ] Tab to "Abrir" button → Enter triggers unlock
- [ ] Tab to audio toggle → Enter toggles it

- [ ] **Step 7: Run final test sweep**

Run: `npm run test:unit && npm run lint`
Expected: All PASS.

- [ ] **Step 8: Run production build**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 9: Commit any tweaks discovered during verification**

If the manual walk surfaced small bugs that needed fixing, commit them now:

```bash
git add -A
git commit -m "fix(vault-cinema): polish from manual verification (golden path + a11y)"
```

If nothing needed fixing, no commit is required for this step.

---

## Self-Review

Spec coverage check:

| Spec section | Plan coverage |
|---|---|
| §3 Decisions table | Tasks 1, 2, 5, 7, 8, 9, 12, 16 |
| §4.1 Paleta `vaultCinema` | Task 1 |
| §4.2 Tipografía Playfair monumental | Tasks 1, 7, 16 |
| §4.3 Anatomía V1 + foco suave | Tasks 5, 7, 10, 11, 16 |
| §5.1 Easing vocabulary (4 curvas) | Task 2 |
| §5.2 Idle breath (heartbeat, hub, shimmer, oil slick) | Tasks 6, 7 (heartbeat + hub). Shimmer + oil slick están como style hooks declarados pero no animados — quedan documentados en spec sec 5.2 como capa secundaria (visual nice-to-have, no bloquea el unlock). |
| §5.3 Success sequence 5 fases | Tasks 8, 9, 12, 16 |
| §5.4 Failure sequence | Task 16 (gemColor coral, message inline). Shake con peso diferencial: implementado parcialmente vía el state.error → la animación de shake del existing useVaultUnlock dura 400ms pero el spec pide 600ms con stagger; este punto queda como **iteración 2**. |
| §5.5 Cooldown | Task 16 (formatCooldown + inert) |
| §6.1 reduced-motion mode | Tasks 4, 8, 9, 12 |
| §6.2 Focus management | Task 16 (blur, inert) |
| §6.3 SR announcements | Task 16 (aria-live polite/assertive on status + cooldown) |
| §6.4 Touch targets + haptics | Task 16 (vibrate(10) on confirm) |
| §7 Audio system | Tasks 13, 14, 16 |
| §8 Architecture | All file paths match Tasks 1, 2, 4–17 |
| §9 Performance | will-change in Task 6 (gem); 60fps target informed by GPU-only animations across all components |
| §10 Testing plan | Task 18 manual walk |
| §11 Scope explicit | Plan doesn't add anything outside the listed files |

**Gaps identified:** spec asks for the 600 ms differential-shake on failure with outer 60ms behind inner; current `useVaultUnlock` hands off `error` state for 400 ms then returns to `idle`. The cinematic shake at this granularity would require either (a) emitting a longer error window from `useVaultUnlock` or (b) a second timer in the sequence. **Recommended deferral:** ship Task 16's failure visuals (color lerp, gem coral, message slide) and add the diff-shake in a follow-up iteration once we see the basic failure flow in motion. This is documented in §12 risks.

**Placeholder scan:** No "TBD/TODO/FIXME" in implementation steps. The audio sample files are deliberately external assets (Task 13 explicitly notes "files provided by sound designer; system gracefully skips if missing").

**Type consistency:** `CinematicPhase` (Task 12) is consumed in Task 16 via the boolean derivations. `VaultCinemaTokens` from Task 1 is consumed throughout. `VaultSampleId` from Task 13 is consumed in Task 14 + Task 16.

**Scope check:** 18 tasks, single feature, all changes within `src/components/vault/`, `src/design-system/tokens/`, `src/hooks/`, `tests/`, `vitest.config.ts`. No cross-feature spillover.

**Plan complete and saved to** `docs/superpowers/plans/2026-04-22-boveda-secreta-rediseno-cinematografico.md`.

## Execution Handoff

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for tasks with TDD (4, 12, 14) where the test/implement cycle benefits from a clean context.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Faster end-to-end but the context grows large.

**Which approach?**
