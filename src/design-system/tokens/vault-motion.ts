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
