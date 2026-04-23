import { emeraldCore, goldAccent, vaultCinema } from '../design-system';
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
  { id: 'sol', name: 'Sol', color: goldAccent.light },
  { id: 'luna', name: 'Luna', color: '#C0C0C0' },
  { id: 'montana', name: 'Montaña', color: emeraldCore.primary },
  { id: 'rio', name: 'Río', color: '#4A90E2' },
  { id: 'arbol', name: 'Árbol', color: emeraldCore.dark },
  { id: 'ojo', name: 'Ojo', color: goldAccent.dark },
  { id: 'estrella', name: 'Estrella', color: goldAccent.light },
  { id: 'condor', name: 'Cóndor', color: '#8B7355' },
  { id: 'jaguar', name: 'Jaguar', color: goldAccent.primary },
  { id: 'espiral', name: 'Espiral', color: emeraldCore.light },
  { id: 'corazon_verde', name: 'Corazón Verde', color: emeraldCore.primary },
] as const;

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
