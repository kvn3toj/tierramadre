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
